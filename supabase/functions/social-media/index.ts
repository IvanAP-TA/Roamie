/**
 * social-media: stores the carousel slides the social bot (video/automation) renders, so Instagram and TikTok can
 * fetch them from a public URL (they don't accept image uploads). Served as https://roamie.org/social/<path> through
 * a Vercel rewrite, because TikTok only pulls from a verified domain.
 *
 * - PUT ?path=2026-10-14-ab12cd/1.jpg with a JPEG body and the x-social-secret header: stores the file.
 * - Every upload also deletes folders older than KEEP_DAYS: once posted, the platforms keep their own copy.
 *
 * Only the bot knows SOCIAL_UPLOAD_SECRET (an Edge Function secret and a GitHub secret with the same value), so the
 * bucket can't be used by anyone else to host files; it only ever holds the bot's JPEGs.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET = 'social'
const KEEP_DAYS = 21
const MAX_BYTES = 5 * 1024 * 1024
const PATH = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]{4,16}\/\d{1,2}\.jpg$/

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Compares secrets in constant time, so the response time says nothing about how much of a guess was right. */
function sameSecret(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given)
  const b = new TextEncoder().encode(expected)
  let diff = a.length ^ b.length
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i]
  return diff === 0
}

let bucketReady: Promise<void> | null = null

/** The public bucket, created on first use: JPEGs only, 5 MB at most. */
function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const { error } = await admin.storage.getBucket(BUCKET)
    if (!error) return
    const created = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES, allowedMimeTypes: ['image/jpeg'] })
    if (created.error && !/already exists/i.test(created.error.message)) throw created.error
  })().catch((error) => {
    bucketReady = null
    throw error
  })
  return bucketReady
}

/** Deletes the folders of posts older than KEEP_DAYS (folder names start with their date). */
async function prune() {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10)
  const { data: folders } = await admin.storage.from(BUCKET).list('', { limit: 1000 })
  for (const folder of folders ?? []) {
    if (folder.name.slice(0, 10) >= cutoff) continue
    const { data: files } = await admin.storage.from(BUCKET).list(folder.name, { limit: 100 })
    if (files?.length) await admin.storage.from(BUCKET).remove(files.map((f) => `${folder.name}/${f.name}`))
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('SOCIAL_UPLOAD_SECRET')
  if (!secret) return json(503, { error: 'not_configured' })
  if (req.method !== 'PUT') return json(405, { error: 'method' })
  if (!sameSecret(req.headers.get('x-social-secret') ?? '', secret)) return json(401, { error: 'unauthorized' })

  const path = new URL(req.url).searchParams.get('path') ?? ''
  if (!PATH.test(path)) return json(400, { error: 'path' })
  const body = new Uint8Array(await req.arrayBuffer())
  if (body.length === 0 || body.length > MAX_BYTES) return json(413, { error: 'size' })
  if (body[0] !== 0xff || body[1] !== 0xd8 || body[2] !== 0xff) return json(415, { error: 'not_jpeg' })

  await ensureBucket()
  const { error } = await admin.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true, cacheControl: '86400' })
  if (error) return json(500, { error: 'upload', message: error.message })
  await prune().catch(() => {})
  return json(200, { path, url: `https://roamie.org/social/${path}` })
})
