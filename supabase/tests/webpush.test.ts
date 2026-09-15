import { describe, expect, it } from 'vitest'
import { renderPush } from '../functions/push-send/messages.ts'
import {
  base64UrlDecode,
  base64UrlEncode,
  concat,
  deriveContentKeys,
  encryptPayload,
  generateVapidKeys,
  importVapidKeys,
  vapidAuthorization,
} from '../functions/push-send/webpush.ts'

const P256 = { name: 'ECDH', namedCurve: 'P-256' } as const

/** What the browser does with a push message (RFC 8291), written from the receiving side. */
async function decrypt(message: Uint8Array, clientKeys: CryptoKeyPair, authSecret: Uint8Array) {
  const view = new DataView(message.buffer, message.byteOffset)
  const salt = message.slice(0, 16)
  expect(view.getUint32(16)).toBe(4096)
  const idLength = message[20]
  const serverPublic = message.slice(21, 21 + idLength)
  const clientPublic = new Uint8Array(await crypto.subtle.exportKey('raw', clientKeys.publicKey))

  const serverKey = await crypto.subtle.importKey('raw', serverPublic, P256, false, [])
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: serverKey }, clientKeys.privateKey, 256))
  const { cek, nonce } = await deriveContentKeys(sharedSecret, authSecret, salt, clientPublic, serverPublic)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const padded = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, message.slice(21 + idLength)))
  expect(padded.at(-1)).toBe(2)
  return new TextDecoder().decode(padded.slice(0, -1))
}

/** A P-256 private key from its base64url `d` and raw public point. */
async function importPair(privateD: string, publicRaw: string, usages: KeyUsage[]): Promise<CryptoKeyPair> {
  const point = base64UrlDecode(publicRaw)
  const jwk = { kty: 'EC', crv: 'P-256', d: privateD, x: base64UrlEncode(point.slice(1, 33)), y: base64UrlEncode(point.slice(33, 65)) }
  return {
    privateKey: await crypto.subtle.importKey('jwk', jwk, P256, true, usages),
    publicKey: await crypto.subtle.importKey('raw', point, P256, true, []),
  }
}

describe('web push encryption', () => {
  it('matches the RFC 8291 example message', async () => {
    const serverKeys = await importPair(
      'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
      'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
      ['deriveBits'],
    )
    const message = await encryptPayload(
      new TextEncoder().encode('When I grow up, I want to be a watermelon'),
      { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' },
      { salt: base64UrlDecode('DGv6ra1nlYgDCS1FRnbzlw'), serverKeys },
    )
    expect(base64UrlEncode(message)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    )
  })

  it('produces a message the browser can decrypt', async () => {
    const clientKeys = (await crypto.subtle.generateKey(P256, true, ['deriveBits'])) as CryptoKeyPair
    const authSecret = crypto.getRandomValues(new Uint8Array(16))
    const target = {
      p256dh: base64UrlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', clientKeys.publicKey))),
      auth: base64UrlEncode(authSecret),
    }
    const payload = JSON.stringify({ title: 'Estate 2027', body: 'Vera ha proposto Lisbona 🇵🇹' })
    const message = await encryptPayload(new TextEncoder().encode(payload), target)
    expect(await decrypt(message, clientKeys, authSecret)).toBe(payload)
  })
})

describe('VAPID', () => {
  it('signs a JWT for the push service origin that verifies with the public key', async () => {
    const stored = await generateVapidKeys()
    // What Vault hands back is plain JSON.
    const keys = await importVapidKeys(JSON.parse(JSON.stringify(stored)))
    const now = Date.UTC(2027, 6, 1)
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys, 'mailto:test@example.com', now)

    const [, token, publicKey] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(publicKey).toBe(stored.publicKey)
    expect(base64UrlDecode(publicKey)).toHaveLength(65)
    const [head, claims, signature] = token.split('.')
    expect(JSON.parse(new TextDecoder().decode(base64UrlDecode(claims)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: now / 1000 + 12 * 60 * 60,
      sub: 'mailto:test@example.com',
    })
    const verifier = await crypto.subtle.importKey('raw', base64UrlDecode(publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      verifier,
      base64UrlDecode(signature),
      new TextEncoder().encode(`${head}.${claims}`),
    )
    expect(valid).toBe(true)
  })

  it('round-trips base64url', () => {
    const bytes = concat(new Uint8Array([0, 250, 251, 252]), crypto.getRandomValues(new Uint8Array(29)))
    expect(base64UrlDecode(base64UrlEncode(bytes))).toEqual(bytes)
  })
})

describe('notification texts', () => {
  it('writes each event in the device language and links to the right view', () => {
    expect(renderPush('destination', 'it', { actor: 'Vera', destination: 'Lisbona', destination_id: 'd1' }, 't1', 'Estate 2027')).toEqual({
      title: 'Estate 2027',
      body: 'Vera ha proposto Lisbona',
      url: '/trips/t1?d=d1',
      tag: 'destination:d1',
      lang: 'it',
    })
    expect(renderPush('dates_fixed', 'en', { start: '2027-07-10', end: '2027-07-17' }, 't1', 'Summer').body).toBe('Dates are set: Jul 10 – Jul 17 ✈️')
    expect(renderPush('dates_open', 'es', { actor: null }, 't1', 'Verano')).toMatchObject({
      body: 'Alguien ha abierto la elección de fechas: marca cuándo estás libre',
      url: '/trips/t1/itinerary?view=dates',
    })
    expect(renderPush('member', 'fr', { actor: 'Sam' }, 't1', null)).toMatchObject({ title: 'Roamie', body: 'Sam è entrato nel gruppo', url: '/trips/t1/group' })
    expect(
      renderPush('mention', 'it', { actor: 'Vera', destination: 'Oslo', destination_id: 'd2', excerpt: '@Olivia ci sei?', all: false }, 't1', 'Nord'),
    ).toMatchObject({ body: 'Vera ti ha menzionato su Oslo: “@Olivia ci sei?”', url: '/trips/t1?d=d2', tag: 'mention:d2' })
    expect(renderPush('mention', 'en', { actor: 'Vera', destination: 'Oslo', destination_id: 'd2', excerpt: 'Ready? @all', all: true }, 't1', 'North').body).toBe(
      'Vera to everyone on Oslo: “Ready? @all”',
    )
  })
})
