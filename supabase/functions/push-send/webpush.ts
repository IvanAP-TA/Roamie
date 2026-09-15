/**
 * Web Push with WebCrypto only, so it runs unchanged on Deno (Edge Functions) and Node (tests):
 * message encryption (RFC 8291, aes128gcm) and VAPID authentication (RFC 8292).
 */

export interface PushTarget {
  endpoint: string
  /** The browser's P-256 public key, base64url */
  p256dh: string
  /** The browser's 16-byte auth secret, base64url */
  auth: string
}

/** As saved in Vault. */
export interface StoredVapidKeys {
  /** Uncompressed P-256 point, base64url: the browser's `applicationServerKey` */
  publicKey: string
  privateJwk: JsonWebKey
}

export interface VapidKeys {
  publicKey: string
  privateKey: CryptoKey
}

const encoder = new TextEncoder()
const P256 = { name: 'ECDH', namedCurve: 'P-256' } as const

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const hmacKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, data))
}

/** RFC 8291 §3.4 and RFC 8188 §2.2: the content encryption key and nonce for one message. */
export async function deriveContentKeys(
  sharedSecret: Uint8Array,
  authSecret: Uint8Array,
  salt: Uint8Array,
  clientPublic: Uint8Array,
  serverPublic: Uint8Array,
): Promise<{ cek: Uint8Array; nonce: Uint8Array }> {
  const prkKey = await hmac(authSecret, sharedSecret)
  const keyInfo = concat(encoder.encode('WebPush: info\0'), clientPublic, serverPublic)
  const ikm = await hmac(prkKey, concat(keyInfo, new Uint8Array([1])))
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, concat(encoder.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, concat(encoder.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)
  return { cek, nonce }
}

/** Encrypts one push message as a single aes128gcm record. `salt` and `serverKeys` are only passed by tests. */
export async function encryptPayload(
  plaintext: Uint8Array,
  target: Pick<PushTarget, 'p256dh' | 'auth'>,
  options: { salt?: Uint8Array; serverKeys?: CryptoKeyPair } = {},
): Promise<Uint8Array> {
  const clientPublic = base64UrlDecode(target.p256dh)
  const authSecret = base64UrlDecode(target.auth)
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const serverKeys = options.serverKeys ?? ((await crypto.subtle.generateKey(P256, true, ['deriveBits'])) as CryptoKeyPair)
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey))

  const clientKey = await crypto.subtle.importKey('raw', clientPublic, P256, false, [])
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeys.privateKey, 256))
  const { cek, nonce } = await deriveContentKeys(sharedSecret, authSecret, salt, clientPublic, serverPublic)

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // 0x02 marks the last (and only) record; no padding.
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(plaintext, new Uint8Array([2]))))

  // Header: salt (16) | record size (uint32) | key id length (1) | key id = the server's public key
  const header = new Uint8Array(21 + serverPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = serverPublic.length
  header.set(serverPublic, 21)
  return concat(header, ciphertext)
}

export async function generateVapidKeys(): Promise<StoredVapidKeys> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  return {
    publicKey: base64UrlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))),
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
  }
}

export async function importVapidKeys(stored: StoredVapidKeys): Promise<VapidKeys> {
  const { key_ops: _ops, ext: _ext, ...jwk } = stored.privateJwk
  const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  return { publicKey: stored.publicKey, privateKey }
}

/** RFC 8292: a JWT for the push service's origin, signed with the application server's key. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, subject: string, now = Date.now()): Promise<string> {
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = base64UrlEncode(
    encoder.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: subject })),
  )
  // WebCrypto's ECDSA signature is already the raw r || s form that JWS expects.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, encoder.encode(`${header}.${claims}`)),
  )
  return `vapid t=${header}.${claims}.${base64UrlEncode(signature)}, k=${keys.publicKey}`
}

/** Sends one message and returns the push service's HTTP status (404/410: the subscription is gone). */
export async function sendPush(target: PushTarget, payload: string, keys: VapidKeys, subject: string, ttlSeconds = 24 * 60 * 60): Promise<number> {
  const body = await encryptPayload(encoder.encode(payload), target)
  const response = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, keys, subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
      Urgency: 'normal',
    },
    body,
  })
  await response.body?.cancel()
  return response.status
}
