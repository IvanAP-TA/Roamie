import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts', 'api/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
