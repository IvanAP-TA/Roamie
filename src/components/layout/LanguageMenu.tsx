import { Check, Languages } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { localizedPath, pathLanguage } from '@/content/guides/meta'
import { LANGUAGES, type LanguageCode } from '@/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { triggerClass } from './LanguageSwitcher'

/** The language menu itself, loaded by LanguageSwitcher on the first tap. */
export default function LanguageMenu({ className, defaultOpen }: { className?: string; defaultOpen?: boolean }) {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const current = i18n.resolvedLanguage ?? 'en'

  const change = (lng: string) => {
    void i18n.changeLanguage(lng)
    // The landings and the guides have one URL per language. The page's own hreflang links know its translations
    // (month and comparison pages included); the path rules are the fallback.
    const alternate = pathLanguage(location.pathname) ? document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${lng}"]`)?.href : undefined
    const target = (alternate && new URL(alternate).pathname) || localizedPath(location.pathname, lng as LanguageCode)
    if (target) navigate({ pathname: target, search: location.search })
  }

  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger aria-label={t('common.language')} className={cn(triggerClass, className)}>
        <Languages className="size-3.5 opacity-70" />
        {current}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={current} onValueChange={change}>
          {LANGUAGES.map((lang) => (
            <DropdownMenuRadioItem key={lang.code} value={lang.code}>
              <span className="w-6 text-[0.7rem] font-bold tracking-wider text-muted-foreground uppercase">{lang.code}</span>
              <span className="flex-1">{lang.label}</span>
              {current === lang.code && <Check />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
