import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Globe2, Loader2, MapPin, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import {
  CONTINENTS,
  DISTANCES,
  FAME,
  LENGTHS,
  MAX_DAYS,
  PACES,
  useAddIdeaToTrip,
  useCreateTripFromIdea,
  useIdeaItinerary,
  useSuggestIdeas,
  type Criteria,
  type Idea,
  type Itinerary,
} from '@/hooks/useTripIdeas'
import { flagEmoji } from '@/lib/flags'
import { MOODS, type BudgetLevel, type Mood } from '@/lib/types'
import { cn } from '@/lib/utils'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { BudgetIndicator, MOOD_META, MoodTag } from '@/components/destinations/moods'
import { TripChoiceList } from '@/components/trips/TripChoiceList'
import { Button } from '@/components/ui/button'
import { Chip, Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { AiErrorNote, PlanSkeleton, PlanView } from './PlanView'

// The preview page (src/dev) shows the plan as TripFinder used to export it.
export { PlanView }
import { dateFormat } from '@/lib/intl'

const EMPTY: Criteria = { moods: [], continent: null, budget: null, month: null, length: null, fame: null, distance: null, pace: null }
const DEFAULT_DAYS = { weekend: 3, week: 6, long: 12 } as const
const MAX_MOODS = 3
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

type Step = 'criteria' | 'ideas' | 'plan' | 'pick'

/**
 * "Trova la meta con l'AI" on the globe: choices made with buttons only (so nothing typed goes to the model), then
 * 3 places, a day-by-day plan for one of them, and a trip with both (new, or one of the user's).
 */
export function TripFinder({
  open,
  onOpenChange,
  onShowCountry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Turn the globe to a suggested place's country */
  onShowCountry: (code: string) => void
}) {
  const { t } = useTranslation()
  const { session, isGuest } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('criteria')
  const [criteria, setCriteria] = useState<Criteria>(EMPTY)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [seen, setSeen] = useState<string[]>([])
  const [chosen, setChosen] = useState<Idea | null>(null)
  const [days, setDays] = useState(4)
  const [plan, setPlan] = useState<Itinerary | null>(null)

  const suggest = useSuggestIdeas()
  const itinerary = useIdeaItinerary()
  const createTrip = useCreateTripFromIdea()
  const addToTrip = useAddIdeaToTrip()
  const saving = createTrip.isPending || addToTrip.isPending

  const find = (exclude: string[]) =>
    suggest.mutate(
      { criteria, exclude },
      {
        onSuccess: (found) => {
          setIdeas(found)
          setSeen([...exclude, ...found.map((idea) => idea.name)].slice(-12))
          setStep('ideas')
        },
      },
    )

  const openPlan = (idea: Idea) => {
    if (chosen?.name !== idea.name) {
      setPlan(null)
      itinerary.reset()
    }
    setChosen(idea)
    setDays(criteria.length ? DEFAULT_DAYS[criteria.length] : 4)
    setStep('plan')
  }

  const makePlan = () => {
    if (!chosen) return
    itinerary.mutate({ idea: chosen, days, criteria }, { onSuccess: setPlan })
  }

  const saved = (tripId: string, message: string) => {
    onOpenChange(false)
    toast.success(message, { action: { label: t('guides.openTrip'), onClick: () => navigate(`/trips/${tripId}`) } })
  }

  const create = () => {
    if (!chosen) return
    createTrip.mutate(
      { idea: chosen, itinerary: plan },
      {
        onSuccess: (tripId) => {
          onOpenChange(false)
          toast.success(t('tripFinder.created', { place: chosen.name }))
          navigate(`/trips/${tripId}${plan ? '/itinerary' : ''}`)
        },
        onError: () => toast.error(t('errors.generic')),
      },
    )
  }

  const add = (tripId: string, tripName: string) => {
    if (!chosen || saving) return
    addToTrip.mutate(
      { tripId, idea: chosen, itinerary: plan },
      {
        onSuccess: () => saved(tripId, t(plan ? 'tripFinder.addedWithPlan' : 'guides.added', { place: chosen.name, trip: tripName })),
        onError: () => toast.error(t('errors.generic')),
      },
    )
  }

  const title = step === 'plan' || step === 'pick' ? (chosen?.name ?? '') : t('tripFinder.title')

  // The AI needs a Google account: sign in, or link it to the guest account (the Edge Function refuses guests).
  if (!session || isGuest) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} title={t('tripFinder.title')}>
        <div className="space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">{t(isGuest ? 'tripFinder.guest' : 'tripFinder.signIn')}</p>
          <GoogleButton link={isGuest} next="/explore?ai=1" label={isGuest ? t('guest.link') : undefined} />
        </div>
      </Sheet>
    )
  }

  let body: ReactNode
  let footer: ReactNode = null

  if (step === 'criteria') {
    body = <CriteriaForm criteria={criteria} onChange={setCriteria} />
    footer = (
      <div className="space-y-2">
        {suggest.isError && <AiErrorNote error={suggest.error} />}
        <Button className="w-full" disabled={suggest.isPending} onClick={() => find([])}>
          {suggest.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {suggest.isPending ? t('tripFinder.finding') : t('tripFinder.find')}
        </Button>
      </div>
    )
  } else if (step === 'ideas') {
    body = suggest.isPending ? (
      <IdeasSkeleton />
    ) : (
      <ul className="space-y-3">
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.name}
            idea={idea}
            onPlan={() => openPlan(idea)}
            onAdd={() => {
              openPlan(idea)
              setStep('pick')
            }}
            onShow={() => {
              onOpenChange(false)
              onShowCountry(idea.countryCode)
            }}
          />
        ))}
      </ul>
    )
    footer = (
      <div className="space-y-2">
        {suggest.isError && <AiErrorNote error={suggest.error} />}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStep('criteria')}>
            <ArrowLeft />
            {t('tripFinder.change')}
          </Button>
          <Button variant="secondary" className="flex-1" disabled={suggest.isPending} onClick={() => find(seen)}>
            {suggest.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            {t('tripFinder.more')}
          </Button>
        </div>
      </div>
    )
  } else if (step === 'plan' && chosen) {
    body = (
      <div className="space-y-5">
        <button type="button" onClick={() => setStep('ideas')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {t('tripFinder.backToIdeas')}
        </button>
        {!plan && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.04] p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-primary" />
              {t('tripFinder.days', { count: days })}
            </span>
            <span className="flex items-center gap-1">
              <Button variant="glass" size="icon-sm" aria-label={t('tripFinder.fewerDays')} disabled={days <= 1 || itinerary.isPending} onClick={() => setDays(days - 1)}>
                <Minus />
              </Button>
              <Button variant="glass" size="icon-sm" aria-label={t('tripFinder.moreDays')} disabled={days >= MAX_DAYS || itinerary.isPending} onClick={() => setDays(days + 1)}>
                <Plus />
              </Button>
            </span>
          </div>
        )}
        {itinerary.isPending && <PlanSkeleton />}
        {plan && <PlanView plan={plan} />}
        {plan && <p className="text-[0.7rem] text-muted-foreground">{t('tripFinder.planNote')}</p>}
      </div>
    )
    footer = (
      <div className="space-y-2">
        {itinerary.isError && <AiErrorNote error={itinerary.error} />}
        {plan ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={saving} onClick={create}>
              {createTrip.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
              {createTrip.isPending ? t('tripFinder.saving') : t('tripFinder.createTrip')}
            </Button>
            <Button variant="outline" className="flex-1" disabled={saving} onClick={() => setStep('pick')}>
              {t('tripFinder.addToTrip')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={itinerary.isPending} onClick={makePlan}>
              {itinerary.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {itinerary.isPending ? t('tripFinder.planning') : t('tripFinder.makePlan')}
            </Button>
            <Button variant="outline" className="flex-1" disabled={saving || itinerary.isPending} onClick={create}>
              {createTrip.isPending ? <Loader2 className="animate-spin" /> : null}
              {t('tripFinder.createWithoutPlan')}
            </Button>
          </div>
        )}
      </div>
    )
  } else if (step === 'pick' && chosen) {
    body = (
      <div className="space-y-4">
        <button type="button" onClick={() => setStep(plan ? 'plan' : 'ideas')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </button>
        <p className="text-sm text-muted-foreground">{t(plan ? 'tripFinder.pickWithPlan' : 'guides.addDescription')}</p>
        <TripChoiceList onChoose={add} busyTripId={addToTrip.isPending ? (addToTrip.variables?.tripId ?? null) : null} />
        {saving && <p className="text-center text-xs text-muted-foreground">{t('tripFinder.saving')}</p>}
      </div>
    )
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => !saving && onOpenChange(next)}
        title={title}
        description={step === 'criteria' ? t('tripFinder.intro') : undefined}
        footer={footer}
      >
        {body}
      </Sheet>
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[0.7rem] font-bold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  )
}

/** One choice among a few, "any" first. */
function OneOf<T extends string | number>({
  values,
  value,
  onChange,
  label,
  anyLabel,
}: {
  values: readonly T[]
  value: T | null
  onChange: (value: T | null) => void
  label: (value: T) => ReactNode
  anyLabel: string
}) {
  return (
    <>
      <Chip size="sm" active={value === null} onClick={() => onChange(null)}>
        {anyLabel}
      </Chip>
      {values.map((v) => (
        <Chip key={v} size="sm" active={value === v} onClick={() => onChange(value === v ? null : v)}>
          {label(v)}
        </Chip>
      ))}
    </>
  )
}

export function CriteriaForm({ criteria, onChange }: { criteria: Criteria; onChange: (criteria: Criteria) => void }) {
  const { t, i18n } = useTranslation()
  const set = <K extends keyof Criteria>(key: K, value: Criteria[K]) => onChange({ ...criteria, [key]: value })
  const any = t('tripFinder.any')
  const month = (m: number) => dateFormat(i18n.resolvedLanguage, { month: 'short' }).format(new Date(2026, m - 1, 15))

  const toggleMood = (mood: Mood) => {
    if (criteria.moods.includes(mood)) set('moods', criteria.moods.filter((m) => m !== mood))
    else if (criteria.moods.length < MAX_MOODS) set('moods', [...criteria.moods, mood])
    else toast(t('tripFinder.maxMoods', { count: MAX_MOODS }))
  }

  return (
    <div className="space-y-5 pb-2">
      <Section title={t('tripFinder.sections.mood')}>
        {MOODS.map((mood) => {
          const Icon = MOOD_META[mood].icon
          const active = criteria.moods.includes(mood)
          return (
            <Chip key={mood} size="sm" active={active} onClick={() => toggleMood(mood)}>
              <Icon className={cn(!active && MOOD_META[mood].tint)} />
              {t(`moods.${mood}`)}
            </Chip>
          )
        })}
      </Section>
      <Section title={t('tripFinder.sections.continent')}>
        <OneOf values={CONTINENTS} value={criteria.continent} onChange={(v) => set('continent', v)} label={(v) => t(`tripFinder.continents.${v}`)} anyLabel={t('tripFinder.anywhere')} />
      </Section>
      <Section title={t('tripFinder.sections.distance')}>
        <OneOf values={DISTANCES} value={criteria.distance} onChange={(v) => set('distance', v)} label={(v) => t(`tripFinder.distances.${v}`)} anyLabel={any} />
      </Section>
      <Section title={t('tripFinder.sections.budget')}>
        <OneOf values={[1, 2, 3] as const} value={criteria.budget} onChange={(v) => set('budget', v)} label={(v) => t(`budget.${v}`)} anyLabel={any} />
      </Section>
      <Section title={t('tripFinder.sections.month')}>
        <OneOf
          values={MONTHS}
          value={criteria.month}
          onChange={(v) => set('month', v)}
          label={month}
          anyLabel={t('tripFinder.notSure')}
        />
      </Section>
      <Section title={t('tripFinder.sections.length')}>
        <OneOf values={LENGTHS} value={criteria.length} onChange={(v) => set('length', v)} label={(v) => t(`tripFinder.lengths.${v}`)} anyLabel={any} />
      </Section>
      <Section title={t('tripFinder.sections.fame')}>
        <OneOf values={FAME} value={criteria.fame} onChange={(v) => set('fame', v)} label={(v) => t(`tripFinder.fame.${v}`)} anyLabel={any} />
      </Section>
      <Section title={t('tripFinder.sections.pace')}>
        <OneOf values={PACES} value={criteria.pace} onChange={(v) => set('pace', v)} label={(v) => t(`tripFinder.paces.${v}`)} anyLabel={any} />
      </Section>
      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{t('tripFinder.privacy')}</p>
    </div>
  )
}

export function IdeaCard({ idea, onPlan, onAdd, onShow }: { idea: Idea; onPlan: () => void; onAdd: () => void; onShow: () => void }) {
  const { t } = useTranslation()
  return (
    <li className="rounded-[1.5rem] bg-foreground/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight">
            <span aria-hidden className="mr-1.5">
              {flagEmoji(idea.countryCode)}
            </span>
            {idea.name}
          </p>
          <p className="text-sm text-muted-foreground">{idea.country}</p>
        </div>
        <BudgetIndicator level={idea.budget as BudgetLevel} className="shrink-0 pt-1" />
      </div>
      <p className="mt-2 text-sm leading-relaxed">{idea.why}</p>
      {idea.highlights.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {idea.highlights.map((h) => (
            <li key={h} className="inline-flex items-center gap-1 rounded-full bg-[var(--paper)] px-2.5 py-1 text-xs">
              <MapPin className="size-3 text-primary" />
              {h}
            </li>
          ))}
        </ul>
      )}
      {idea.moods.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {idea.moods.map((m) => (
            <MoodTag key={m} mood={m} />
          ))}
        </div>
      )}
      <div className="mt-3.5 flex flex-wrap gap-2">
        <Button size="sm" onClick={onPlan}>
          <Sparkles className="size-4" />
          {t('tripFinder.plan')}
        </Button>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="size-4" />
          {t('tripFinder.addToTrip')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onShow}>
          <Globe2 className="size-4" />
          {t('tripFinder.showOnGlobe')}
        </Button>
      </div>
    </li>
  )
}

function IdeasSkeleton() {
  return (
    <div className="space-y-3" role="status">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 rounded-[1.5rem]" />
      ))}
    </div>
  )
}
