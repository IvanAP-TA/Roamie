import { describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import shellHtml from '../../shell.html?raw'
import vercelJson from '../../vercel.json?raw'
// oxlint-disable-next-line import/default -- Vite's ?raw gives the file's text as the default export
import themeSource from './theme.ts?raw'

const inlineScript = (html: string) => html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
const sha256 = async (text: string) => btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))))

describe('the theme script', () => {
  it('is the same in both pages, and the Content-Security-Policy allows it by its hash', async () => {
    const script = inlineScript(indexHtml)
    expect(script).toBeTruthy()
    expect(inlineScript(shellHtml)).toBe(script)
    expect(vercelJson).toContain(`'sha256-${await sha256(script!)}'`)
  })

  it('reads the same key the Profile setting writes', () => {
    expect(inlineScript(indexHtml)).toContain("localStorage.getItem('roamie.theme')")
    expect(themeSource).toContain("const KEY = 'roamie.theme'")
  })
})
