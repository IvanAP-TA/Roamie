import { startTransition, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Languages, X } from 'lucide-react'
import { localizedPath } from '@/content/guides/meta'
import { LANGUAGES, type LanguageCode } from '@/i18n'

const DISMISSED = 'roamie.langHint'

// Written here rather than in the locale files: the offer is in a language the page hasn't loaded, and fetching a
// whole translation file for three strings isn't worth it.
const TEXT: Record<LanguageCode, { text: string; open: string; dismiss: string }> = {
  it: { text: 'Questa pagina è disponibile anche in italiano.', open: 'Leggi in italiano', dismiss: 'Chiudi' },
  en: { text: 'This page is also available in English.', open: 'Read in English', dismiss: 'Close' },
  es: { text: 'Esta página también está disponible en español.', open: 'Leer en español', dismiss: 'Cerrar' },
}

/** The first of the browser's languages that Roamie speaks. */
function browserLanguage(): LanguageCode | null {
  const supported = new Set<string>(LANGUAGES.map((l) => l.code))
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.slice(0, 2).toLowerCase()
    if (supported.has(code)) return code as LanguageCode
  }
  return null
}

/**
 * On pages whose URL fixes the language (landings, guides), visitors whose browser speaks another of Roamie's
 * languages get a small offer to switch, written in their language. No automatic redirect: crawlers and shared links
 * keep landing on the page they asked for. Shown after mount only, so the prerendered HTML stays the same, and floating,
 * so it moves nothing on the page.
 */
export function LanguageHint({ lang }: { lang: LanguageCode }) {
  const location = useLocation()
  const [offer, setOffer] = useState<{ target: LanguageCode; path: string } | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED)) return
    } catch {
      // storage unavailable: still offer it
    }
    const target = browserLanguage()
    // A transition, like the offer below: this runs as React adopts a prerendered page, which an urgent update would
    // make it finish in one long task.
    if (!target || target === lang) return startTransition(() => setOffer(null))
    // The page's own hreflang links know its translations (month and comparison pages included); the path rules are
    // the fallback. Read once the page has set its metadata.
    const timer = setTimeout(() => {
      const alternate = document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${target}"]`)?.href
      const path = (alternate && new URL(alternate).pathname) || localizedPath(location.pathname, target)
      startTransition(() => setOffer(path && path !== location.pathname ? { target, path } : null))
    }, 300)
    return () => clearTimeout(timer)
  }, [lang, location.pathname])

  if (!offer) return null
  const { target, path } = offer
  const text = TEXT[target]
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, '1')
    } catch {
      // nothing to remember it in
    }
    setOffer(null)
  }

  return (
    // Floating over the bottom of the page, not in its flow: it appears after the page has drawn, and pushing the page
    // down then was the landing's biggest layout shift.
    <div lang={target} className="pointer-events-none fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),1rem)] z-50 flex justify-center px-4">
      <div className="glass-strong pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-2.5 text-sm shadow-lift">
        <Languages className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">{text.text}</span>
        <Link to={path} onClick={dismiss} className="shrink-0 font-semibold text-primary underline-offset-4 hover:underline">
          {text.open}
        </Link>
        <button type="button" onClick={dismiss} aria-label={text.dismiss} className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition hover:bg-foreground/5">
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
