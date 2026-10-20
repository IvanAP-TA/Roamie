/**
 * Offline test harness: runs the real migrations on PGlite (Postgres in WASM) with a
 * minimal stand-in for the Supabase platform (auth schema, roles, default grants,
 * realtime publication), so RLS and RPCs can be verified without a Supabase project.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations')

const SUPABASE_STUB = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    is_anonymous boolean not null default false,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    -- Like Supabase's: after a transaction the setting is left as '' rather than unset.
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;

  create publication supabase_realtime;
`

export type Db = PGlite

export async function createDb(): Promise<Db> {
  const db = new PGlite()
  await db.exec(SUPABASE_STUB)
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    } catch (err) {
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`)
    }
  }
  return db
}

export async function createUser(db: Db, id: string, name: string) {
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `${name.toLowerCase()}@example.com`,
    JSON.stringify({ full_name: name, avatar_url: `https://lh3.googleusercontent.com/a/${name}` }),
  ])
}

/** A guest: Supabase's anonymous sign-in, with only the name they typed. */
export async function createGuest(db: Db, id: string, name: string) {
  await db.query(`insert into auth.users (id, raw_user_meta_data, is_anonymous) values ($1, $2, true)`, [id, JSON.stringify({ full_name: name })])
}

/** Run queries as a given user (or anon when userId is null), like PostgREST does. */
export async function as<T>(
  db: Db,
  userId: string | null,
  fn: (q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' }),
    ])
    await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`)
    return fn(async (sql, params) => (await tx.query(sql, params)).rows as never)
  })
}
