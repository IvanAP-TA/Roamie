import { Check, Languages } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, type LanguageCode } from '@/i18n'
import { LANDING_PATHS, landingLanguage } from '@/lib/seo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const current = i18n.resolvedLanguage ?? 'en'

  const change = (lng: string) => {
    void i18n.changeLanguage(lng)
    // Each language of the public landing has its own URL.
    if (landingLanguage(location.pathname)) {
      navigate({ pathname: LANDING_PATHS[lng as LanguageCode], search: location.search })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('common.language')}
        className={cn(
          'glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold tracking-wider uppercase transition active:scale-95',
          className,
        )}
      >
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
