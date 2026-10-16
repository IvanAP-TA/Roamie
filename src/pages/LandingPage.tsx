import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowBigUp, ArrowRight, CalendarDays, Dices, MapPinPlus, Plus, Sparkles, Vote } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useSeo } from '@/hooks/useSeo'
import { LANGUAGES, type LanguageCode } from '@/i18n'
import { FAQ_KEYS, LANDING_PATHS } from '@/lib/seo'
import { hasStoredSession, isSupabaseConfigured } from '@/lib/supabaseEnv'
import { cn, safeNextPath } from '@/lib/utils'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { Logo } from '@/components/brand/Logo'
import { Scene } from '@/components/brand/Scene'
import { AttributionChip } from '@/components/media/Attribution'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { TryWithoutAccount } from '@/components/auth/TryWithoutAccount'
import { LanguageHint } from '@/components/layout/LanguageHint'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Footer } from '@/components/layout/Footer'
import { Splash } from '@/components/layout/Splash'
import { GuideCards } from '@/components/guides/GuideCards'
import { InstallAppButton } from '@/components/install/InstallApp'
import { GUIDE_BASE } from '@/content/guides/meta'
import { comingMonths, MONTH_LINK, monthName, monthPath } from '@/content/guides/months'
import { useToday } from '@/hooks/useToday'

/**
 * The landing page animates with CSS only (see the intro rules in index.css): it's the page most visitors see first,
 * and the animation library would be the biggest script to start on a phone.
 */

/** A photo of the place from Wikimedia Commons, cropped to the card (public/landing/<file>-<width>.avif). */
const photo = (file: string, author: string, license: string, commonsFile: string) => ({
  file,
  attribution: JSON.stringify({
    author,
    license,
    licenseUrl: `https://creativecommons.org/licenses/${license.replace(/^CC /, '').split(' ')[0].toLowerCase()}/${license.split(' ').at(-1)}`,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${commonsFile}`,
  }),
})

const POSTCARDS = [
  { name: 'Lisboa', country: 'Portugal', votes: 7, rotate: -9, x: '-38%', y: '6%', delay: 0, photo: photo('lisbon', 'Vitor Oliveira', 'CC BY-SA 2.0', 'Lisboa_-_Portugal_(52597836992).jpg') },
  { name: 'Oaxaca', country: 'México', votes: 5, rotate: 8, x: '38%', y: '10%', delay: 0.6, photo: photo('oaxaca', 'Luisalvaz', 'CC BY-SA 4.0', 'Fachada_del_Templo_de_Santo_Domingo_de_Guzmán,_Oaxaca,_Oax..JPG') },
  { name: 'Kyoto', country: '日本', votes: 11, rotate: -1, x: '0%', y: '-4%', delay: 0.3, photo: photo('kyoto', 'Josep M. Gracia', 'CC BY-SA 4.0', 'GIO_-_Yasaka_Pagoda_seen_from_Higashiyama_near_Gion,_Kyoto,_Japan,_2015.jpg') },
]

const FEATURES = [
  { key: 'propose', icon: MapPinPlus },
  { key: 'vote', icon: Vote },
  { key: 'spin', icon: Dices },
  { key: 'plan', icon: CalendarDays },
] as const

/** A card that can be dragged around and springs back to its place when let go. */
function Postcard({ card, index }: { card: (typeof POSTCARDS)[number]; index: number }) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const dragging = offset !== null

  const end = () => {
    start.current = null
    setOffset(null)
  }

  return (
    <div
      className="postcard absolute top-[4%] left-1/2 w-[38%] sm:top-[8%] sm:w-[46%]"
      style={
        {
          '--x': card.x,
          '--y': card.y,
          '--r': `${card.rotate}deg`,
          '--delay': `${0.15 + card.delay}s`,
          zIndex: dragging ? 10 : index,
        } as React.CSSProperties
      }
    >
      <div
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          start.current = { x: e.clientX, y: e.clientY }
          setOffset({ x: 0, y: 0 })
        }}
        onPointerMove={(e) => start.current && setOffset({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })}
        onPointerUp={end}
        onPointerCancel={end}
        style={
          dragging
            ? { transform: `translate(${offset.x}px, ${offset.y}px) rotate(${-card.rotate}deg) scale(1.06)`, transition: 'none' }
            : ({ '--lift-r': `${-card.rotate / 2}deg` } as React.CSSProperties)
        }
        className={cn(
          'touch-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] select-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab hover:[transform:translateY(-8px)_rotate(var(--lift-r))]',
        )}
      >
        <div
          // CSS animation: it runs on the compositor instead of a JavaScript update every frame.
          style={{ animationDuration: `${5 + index}s`, animationDelay: `${card.delay}s` }}
          className="animate-float rounded-[1.6rem] bg-paper p-2 shadow-lift"
        >
          {/* The illustrated scene shows until the photo is there (and stays where AVIF isn't supported). */}
          <Scene seed={card.name} className="aspect-[3/4] rounded-[1.2rem]">
            <picture>
              <source type="image/avif" srcSet={`/landing/${card.photo.file}-360.avif 360w, /landing/${card.photo.file}-600.avif 600w`} sizes="(min-width: 768px) 15rem, (min-width: 640px) 12rem, 38vw" />
              <img src={`/landing/${card.photo.file}-480.jpg`} alt="" width={600} height={800} decoding="async" draggable={false} className="absolute inset-0 size-full object-cover" />
            </picture>
            <span className="absolute top-2.5 right-2.5 flex size-11 rotate-12 items-center justify-center rounded-full border-[1.5px] border-dashed border-white/80 text-[0.5rem] leading-none font-bold tracking-[0.12em] text-white/90 uppercase drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)]">
              roamie
            </span>
            <AttributionChip raw={card.photo.attribution} compact className="absolute bottom-2 left-2 z-10" />
          </Scene>
          <div className="flex items-end justify-between gap-2 px-1.5 pt-2 pb-1">
            <div className="min-w-0">
              <p className="truncate font-display text-lg leading-tight italic">{card.name}</p>
              <p className="truncate text-[0.7rem] text-muted-foreground">{card.country}</p>
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
              <ArrowBigUp className="size-3.5" />
              {card.votes}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PostcardFan() {
  const { t } = useTranslation()
  return (
    <div className="relative mx-auto aspect-[3/2] w-full max-w-[22rem] sm:aspect-[5/4] sm:max-w-[26rem] md:max-w-[32rem]">
      {POSTCARDS.map((card, i) => (
        <Postcard key={card.name} card={card} index={i} />
      ))}

      <div
        style={{ '--delay': '1.1s' } as React.CSSProperties}
        className="intro-pop glass-strong absolute right-[2%] bottom-[2%] z-20 flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-[conic-gradient(var(--sun),var(--coral),var(--primary),var(--sun))] text-white">
          <Dices className="size-4" />
        </span>
        {t('landing.badge')}
      </div>
    </div>
  )
}

export default function LandingPage({ lang }: { lang: LanguageCode }) {
  const today = useToday()
  const { t, i18n } = useTranslation()
  const { session, loading } = useAuth()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  // Signed-out visitors (and crawlers) get the page immediately; only a stored session waits for auth.
  const waitingForSession = loading && hasStoredSession()
  useSeo('landing', lang)

  // Each landing URL (/, /en, /es) has a fixed language, matching its prerendered HTML and hreflang.
  useEffect(() => {
    if (!session && !waitingForSession && i18n.resolvedLanguage !== lang) void i18n.changeLanguage(lang)
  }, [session, waitingForSession, lang, i18n])

  if (session) return <Navigate to={next} replace />
  if (waitingForSession) return <Splash />

  const steps = [
    { icon: MapPinPlus, label: t('landing.steps.propose') },
    { icon: Vote, label: t('landing.steps.vote') },
    { icon: Dices, label: t('landing.steps.spin') },
  ]

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <AuroraBackground />

      <header className="pt-safe mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Logo />
        <LanguageSwitcher />
      </header>
      <LanguageHint lang={lang} />

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-5 md:min-h-[calc(100dvh-4.5rem)] md:grid-cols-[1.05fr_1fr] md:gap-12 md:px-8 md:py-10">
          <section className="order-1 pt-2 md:order-2">
            <PostcardFan />
          </section>

          <section className="order-2 flex flex-col gap-5 md:order-1 md:gap-6">
            {/* Transform-only entrance: the headline is the LCP element and is visible in the prerendered HTML. */}
            <div className="intro-rise space-y-4">
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                <Sparkles className="size-3.5" />
                {t('landing.eyebrow')}
              </span>
              <h1 className="text-[2.35rem] leading-[0.98] font-medium sm:text-5xl md:text-6xl lg:text-7xl">
                {t('landing.titleA')}{' '}
                <span className="display-wonk bg-[linear-gradient(100deg,var(--coral),var(--primary)_45%,var(--dusk))] bg-clip-text pr-2 text-transparent">
                  {t('landing.titleB')}
                </span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">{t('landing.subtitle')}</p>
            </div>

            <ol className="glass flex w-full max-w-md divide-x divide-dashed divide-foreground/15 rounded-3xl">
              {steps.map((step, i) => (
                <li
                  key={step.label}
                  style={{ '--rise': '10px', '--duration': '0.5s', '--delay': `${0.35 + i * 0.08}s` } as React.CSSProperties}
                  className="intro-rise flex flex-1 flex-col items-center gap-1 px-2 py-3 text-center"
                >
                  <span className="font-display text-xs text-muted-foreground italic">0{i + 1}</span>
                  <step.icon className="size-5 text-primary" />
                  <span className="text-[0.78rem] leading-tight font-semibold">{step.label}</span>
                </li>
              ))}
            </ol>

            <div
              style={{ '--rise': '16px', '--duration': '0.6s', '--delay': '0.5s' } as React.CSSProperties}
              className="intro-rise w-full max-w-md space-y-3"
            >
              <GoogleButton next={next} />
              <TryWithoutAccount lang={lang} />
              <p className="px-4 text-center text-xs leading-relaxed text-muted-foreground">{t('landing.privacyNote')}</p>
              <div className="flex justify-center">
                <InstallAppButton appearance="link" />
              </div>
              {!isSupabaseConfigured && import.meta.env.DEV && (
                <p className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                  {t('auth.notConfigured')}
                </p>
              )}
            </div>
          </section>
        </div>

        <section aria-labelledby="features-title" className="mx-auto w-full max-w-6xl px-5 pt-20 md:px-8 md:pt-24">
          <h2 id="features-title" className="max-w-xl text-3xl leading-tight md:text-5xl">
            {t('landing.features.title')}
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ key, icon: Icon }, i) => (
              <li key={key} className="glass flex flex-col gap-3 rounded-[1.75rem] p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-display text-sm text-muted-foreground italic">0{i + 1}</span>
                </div>
                <h3 className="text-xl leading-snug">{t(`landing.features.${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(`landing.features.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="guides-title" className="mx-auto w-full max-w-6xl px-5 pt-20 md:px-8 md:pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 id="guides-title" className="text-3xl leading-tight md:text-5xl">
                {t('landing.guides.title')}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{t('landing.guides.body')}</p>
            </div>
            <Link
              to={GUIDE_BASE[lang]}
              className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t('guides.all')}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <GuideCards lang={lang} limit={4} className="mt-8" />
          <ul className="mt-6 flex flex-wrap gap-2">
            {comingMonths(today.getMonth() + 1, 4).map((month) => (
              <li key={month}>
                <Link to={monthPath(month, lang)} className="glass inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition hover:text-primary">
                  {MONTH_LINK[lang](monthName(month, lang))}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl px-5 pt-20 md:px-8 md:pt-24">
          <h2 id="faq-title" className="text-3xl leading-tight md:text-5xl">
            {t('landing.faq.title')}
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="glass group rounded-3xl px-6">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-lg leading-snug [&::-webkit-details-marker]:hidden">
                  {t(`landing.faq.${key}.q`)}
                  <Plus className="size-5 shrink-0 text-primary transition group-open:rotate-45" />
                </summary>
                <p className="pb-5 text-[0.95rem] leading-relaxed text-muted-foreground">{t(`landing.faq.${key}.a`)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md px-5 pt-20 text-center md:pt-24">
          <h2 className="text-3xl leading-tight md:text-4xl">{t('landing.cta.title')}</h2>
          <div className="mt-6">
            <GoogleButton next={next} />
          </div>
        </section>
      </main>

      <nav aria-label={t('common.language')} className="mt-16 flex justify-center gap-2 text-sm">
        {LANGUAGES.map(({ code, label }) => (
          <Link
            key={code}
            to={LANDING_PATHS[code]}
            hrefLang={code}
            lang={code}
            aria-current={code === lang ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-full px-3 underline-offset-4 transition hover:underline',
              code === lang ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Footer className="pt-2" />
    </div>
  )
}
