import { lazy, Suspense, useState } from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const loadMenu = () => import('./LanguageMenu')
const LanguageMenu = lazy(loadMenu)

/** Fetches the menu's code ahead of time, when the browser is idle. */
export function preloadLanguageMenu() {
  void loadMenu().catch(() => {})
}

export const triggerClass =
  'glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tracking-wider uppercase transition active:scale-95'

/**
 * The language button. Until it's first used it is a plain button: the menu (and the positioning library under it)
 * loads on the first tap and opens right away, so it isn't part of the landing page's first download.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const [used, setUsed] = useState(false)
  const current = i18n.resolvedLanguage ?? 'en'

  const button = (
    <button
      type="button"
      // The name starts with what the button shows ("IT"), as voice control users say it.
      aria-label={`${current.toUpperCase()} · ${t('common.language')}`}
      aria-haspopup="menu"
      onPointerEnter={preloadLanguageMenu}
      onFocus={preloadLanguageMenu}
      onClick={() => setUsed(true)}
      className={cn(triggerClass, className)}
    >
      <Languages className="size-3.5 opacity-70" />
      {current}
    </button>
  )
  if (!used) return button
  return (
    <Suspense fallback={button}>
      <LanguageMenu className={className} defaultOpen />
    </Suspense>
  )
}
