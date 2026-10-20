import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowBigUp, ArrowRight, Dices, Plane, Plus } from 'lucide-react'
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
import { guideCardPhoto } from '@/components/guides/GuideCardPhoto'
import { InstallAppButton } from '@/components/install/InstallApp'
import { GUIDE_BASE } from '@/content/guides/meta'
import { comingMonths, MONTH_LINK, monthName, monthPath } from '@/content/guides/months'
import { useToday } from '@/hooks/useToday'
import { haptic } from '@/lib/haptics'

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
  { name: 'Lisboa', country: 'Portugal', votes: 7, delay: 0, photo: photo('lisbon', 'Vitor Oliveira', 'CC BY-SA 2.0', 'Lisboa_-_Portugal_(52597836992).jpg') },
  { name: 'Oaxaca', country: 'México', votes: 5, delay: 0.6, photo: photo('oaxaca', 'Luisalvaz', 'CC BY-SA 4.0', 'Fachada_del_Templo_de_Santo_Domingo_de_Guzmán,_Oaxaca,_Oax..JPG') },
  { name: 'Kyoto', country: '日本', votes: 11, delay: 0.3, photo: photo('kyoto', 'Josep M. Gracia', 'CC BY-SA 4.0', 'GIO_-_Yasaka_Pagoda_seen_from_Higashiyama_near_Gion,_Kyoto,_Japan,_2015.jpg') },
]

/** Where the cards sit: left, right, and in front (the picked one). Each card starts in the slot of its index. */
const SLOTS = [
  { x: '-38%', y: '6%', rotate: -9 },
  { x: '38%', y: '10%', rotate: 8 },
  { x: '0%', y: '-4%', rotate: -1 },
]
const FRONT = 2

/** The steps of "how it works", each with a screenshot of the real app (public/landing/step-*, from the store set). */
const STEPS = ['propose', 'vote', 'spin', 'plan'] as const

/** A card that can be dragged around and springs back to its place when let go. */
function Postcard({ card, slot, live }: { card: (typeof POSTCARDS)[number]; slot: number; live: boolean }) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const dragging = offset !== null
  const place = SLOTS[slot]

  const end = () => {
    start.current = null
    setOffset(null)
  }

  return (
    <div
      // After the first shuffle the deal-in animation is over and the card glides between slots (.postcard-live).
      className={cn('postcard absolute top-[4%] left-1/2 w-[38%] sm:top-[8%] sm:w-[46%]', live && 'postcard-live')}
      style={
        {
          '--x': place.x,
          '--y': place.y,
          '--r': `${place.rotate}deg`,
          '--delay': `${0.15 + card.delay}s`,
          zIndex: dragging ? 10 : slot,
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
            ? { transform: `translate(${offset.x}px, ${offset.y}px) rotate(${-place.rotate}deg) scale(1.06)`, transition: 'none' }
            : ({ '--lift-r': `${-place.rotate / 2}deg` } as React.CSSProperties)
        }
        className={cn(
          'touch-none transition-transform duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] select-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab hover:[transform:translateY(-8px)_rotate(var(--lift-r))]',
        )}
      >
        <div
          // CSS animation: it runs on the compositor instead of a JavaScript update every frame.
          style={{ animationDuration: `${5 + slot}s`, animationDelay: `${card.delay}s` }}
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
              <p className="truncate font-display text-base leading-tight sm:text-lg">{card.name}</p>
              <p className="truncate text-[0.7rem] text-muted-foreground">{card.country}</p>
            </div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground tabular-nums">
              <ArrowBigUp className="size-3.5" />
              {card.votes}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The three postcards, and Roamie's whole idea in one tap: the badge spins them like the wheel, the cards trade
 * places a few times, slowing down, and one lands in front. Before the first tap it is exactly the prerendered fan.
 */
function PostcardFan() {
  const { t } = useTranslation()
  // slots[card] = the slot that card sits in.
  const [slots, setSlots] = useState([0, 1, 2])
  const [spinning, setSpinning] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setPicked(null)
    // A different winner from the card in front now, and enough turns to feel like a draw: each turn moves every
    // card one slot along, the gaps growing like a wheel slowing down.
    const current = slots.indexOf(FRONT)
    const winner = (current + 1 + Math.floor(Math.random() * 2)) % 3
    const turns = ((FRONT - slots[winner] + 3) % 3) + 3
    let elapsed = 0
    for (let i = 1; i <= turns; i++) {
      elapsed += 110 + i * i * 9
      timers.current.push(
        window.setTimeout(() => {
          setSlots((s) => s.map((slot) => (slot + 1) % 3))
          haptic('tap')
        }, elapsed),
      )
    }
    timers.current.push(
      window.setTimeout(() => {
        setSpinning(false)
        setPicked(winner)
        haptic('success')
      }, elapsed + 420),
    )
  }

  const live = spinning || picked !== null
  return (
    <div className="relative mx-auto aspect-[3/2] w-full max-w-[22rem] sm:aspect-[5/4] sm:max-w-[26rem] md:max-w-[32rem]">
      {POSTCARDS.map((card, i) => (
        <Postcard key={card.name} card={card} slot={slots[i]} live={live} />
      ))}

      {/* Over the corner on a phone; under the fan on a computer, where it would cover the right card's name. */}
      <button
        type="button"
        onClick={spin}
        aria-label={t('landing.spinAgain')}
        style={{ '--delay': '1.1s' } as React.CSSProperties}
        className="intro-pop glass-strong pressable absolute right-[2%] bottom-[2%] z-20 flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold whitespace-nowrap md:top-full md:right-auto md:bottom-auto md:left-1/2 md:mt-12 md:-translate-x-1/2"
      >
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-full bg-[conic-gradient(var(--sun),var(--coral),var(--primary),var(--sun))] text-white',
            spinning && 'animate-spin',
          )}
        >
          <Dices className="size-4" />
        </span>
        {/* Read out after a spin: the place that was picked. */}
        <span aria-live="polite">{picked === null ? (spinning ? '…' : t('landing.badge')) : t('landing.picked', { place: POSTCARDS[picked].name })}</span>
      </button>
    </div>
  )
}

/** "How it works": the real app, one screen per step, swiped sideways on a phone and side by side on a computer. */
function HowItWorks({ lang }: { lang: LanguageCode }) {
  const { t } = useTranslation()
  const set = lang === 'it' ? 'it' : 'en'
  return (
    <section aria-labelledby="features-title" className="mx-auto w-full max-w-6xl pt-20 md:px-8 md:pt-24">
      <h2 id="features-title" className="max-w-xl px-5 text-3xl leading-tight md:px-0 md:text-5xl">
        {t('landing.features.title')}
      </h2>
      <ol className="story-strip mt-8 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {STEPS.map((key, i) => (
          <li key={key} className="w-[74%] shrink-0 snap-start sm:w-[44%] md:w-auto">
            <figure className="story-step">
              <picture>
                <source type="image/avif" srcSet={`/landing/step-${key}-${set}-360.avif 360w, /landing/step-${key}-${set}-540.avif 540w`} sizes="(min-width: 768px) 16rem, 74vw" />
                <img
                  src={`/landing/step-${key}-${set}-420.jpg`}
                  alt={t(`landing.features.${key}.title`)}
                  width={540}
                  height={810}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[2/3] w-full rounded-[1.75rem] border border-foreground/10 object-cover object-top shadow-soft"
                />
              </picture>
              <figcaption className="mt-4 px-1">
                <h3 className="flex items-baseline gap-2 text-xl leading-snug">
                  <span className="font-display text-primary tabular-nums">{i + 1}</span>
                  {t(`landing.features.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`landing.features.${key}.body`)}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The page's last call, as one of the app's boarding passes: from the group chat to the next trip. */
function BoardingPass({ next }: { next: string }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="cta-title" className="mx-auto w-full max-w-6xl px-5 pt-20 md:px-8 md:pt-24">
      <div className="drop-shadow-[0_18px_28px_rgb(150_70_30/0.18)] dark:drop-shadow-[0_18px_28px_rgb(0_0_0/0.45)]">
        <div className="ticket-notch mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-paper [--notch-y:6.5rem] md:[--notch-y:7rem]">
          <div className="flex h-[6.5rem] items-center justify-between gap-4 bg-[linear-gradient(115deg,var(--sun),var(--coral)_55%,var(--dusk))] px-6 text-white md:h-28 md:px-10">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-bold tracking-[0.22em] uppercase opacity-80">{t('landing.ticket.from')}</p>
              <p className="line-clamp-2 font-display text-base leading-tight md:text-2xl">{t('landing.ticket.fromValue')}</p>
            </div>
            <Plane aria-hidden className="size-6 shrink-0 opacity-90" />
            <div className="min-w-0 text-right">
              <p className="text-[0.62rem] font-bold tracking-[0.22em] uppercase opacity-80">{t('landing.ticket.to')}</p>
              <p className="line-clamp-2 font-display text-base leading-tight md:text-2xl">{t('landing.ticket.toValue')}</p>
            </div>
          </div>
          <div className="mx-6 border-t-2 border-dashed border-foreground/10 md:mx-10" />
          <div className="grid gap-5 px-6 pt-5 pb-7 md:grid-cols-[1fr_auto] md:items-end md:gap-10 md:px-10 md:pt-7 md:pb-9">
            <div>
              <p className="text-[0.62rem] font-bold tracking-[0.22em] text-muted-foreground uppercase">{t('landing.ticket.boarding')}</p>
              <h2 id="cta-title" className="mt-1 text-3xl leading-tight md:text-4xl">
                {t('landing.cta.title')}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t('landing.ticket.body')}</p>
            </div>
            <div className="w-full md:w-72">
              <GoogleButton next={next} />
            </div>
          </div>
        </div>
      </div>
    </section>
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

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <AuroraBackground />

      <header className="pt-safe mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Logo />
        <LanguageSwitcher />
      </header>
      <LanguageHint lang={lang} />

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-5 md:min-h-[min(calc(100dvh-4.5rem),44rem)] md:grid-cols-[1.05fr_1fr] md:gap-12 md:px-8 md:py-10">
          <section className="order-1 pt-2 md:order-2">
            <PostcardFan />
          </section>

          <section className="order-2 flex flex-col gap-5 md:order-1 md:gap-6">
            {/* Transform-only entrance: the headline is the LCP element and is visible in the prerendered HTML. */}
            <div className="intro-rise space-y-4">
              <h1 className="text-[2.6rem] leading-[0.98] font-medium sm:text-5xl md:text-6xl lg:text-7xl">
                {t('landing.titleA')}{' '}
                {/* The word in the brand's colour, with a stroke drawn under it as if by hand (index.css, .hand-underline). */}
                <span className="relative inline-block text-primary">
                  {t('landing.titleB')}
                  <svg aria-hidden viewBox="0 0 200 18" preserveAspectRatio="none" className="hand-underline absolute -bottom-[0.14em] left-0 h-[0.2em] w-full">
                    <path d="M3 13 C 40 5, 90 4, 130 8 S 185 13, 197 6" pathLength={1} />
                  </svg>
                </span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">{t('landing.subtitle')}</p>
            </div>

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

        <HowItWorks lang={lang} />

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
          <GuideCards lang={lang} limit={4} media={guideCardPhoto} className="mt-8" />
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

        <BoardingPass next={next} />
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
