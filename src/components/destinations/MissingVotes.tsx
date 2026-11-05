import { Link } from 'react-router-dom'
import { BellRing, ChevronRight, FerrisWheel } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useMissingVoters } from '@/hooks/useSecretVoting'
import { useTellGroupNow } from '@/hooks/useTellTheGroup'
import { useTripContext } from '@/hooks/useTripContext'
import { Button } from '@/components/ui/button'
import type { Destination } from '@/lib/types'

/**
 * Where groups stop: places proposed, some points given, then nothing. Until everyone has voted it names who's
 * missing, with a message ready for the group chat; once everyone has, it points to the wheel. Only while there are
 * at least two places open and nothing chosen yet, in a group of two or more.
 */
export function MissingVotes({ destinations }: { destinations: Destination[] }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { trip, members } = useTripContext()
  const open = destinations.filter((d) => d.status === 'proposed').length >= 2 && destinations.every((d) => d.status === 'proposed')
  const active = open && members.length >= 2
  const { data: missing } = useMissingVoters(trip.id, active)
  const tell = useTellGroupNow()
  if (!active || !missing) return null

  const others = missing.filter((id) => id !== user?.id)
  // Only my own points missing: the first steps and the vote buttons already ask for them.
  if (missing.length > 0 && others.length === 0) return null

  if (missing.length === 0) {
    return (
      <Link to={`/trips/${trip.id}/roulette`} className="glass flex items-center gap-3 rounded-[1.75rem] p-4 transition hover:bg-foreground/[0.03]">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <FerrisWheel className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t('missingVotes.allTitle')}</span>
          <span className="block text-sm text-muted-foreground">{t('missingVotes.allBody')}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    )
  }

  const firstName = (id: string) => members.find((m) => m.user_id === id)?.profile?.display_name?.trim().split(' ')[0] || t('group.unknown')
  const names = new Intl.ListFormat(i18n.resolvedLanguage, { type: 'conjunction' }).format(others.slice(0, 3).map(firstName))
  const list = others.length > 3 ? t('missingVotes.andMore', { names, count: others.length - 3 }) : names

  return (
    <section className="glass flex flex-wrap items-center gap-3 rounded-[1.75rem] p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <BellRing className="size-5" />
      </span>
      {/* Wide enough to keep the text whole: on a phone the button drops below it. */}
      <span className="min-w-0 flex-1 basis-52">
        <span className="block font-semibold">{t('missingVotes.title', { names: list })}</span>
      </span>
      <Button size="sm" className="w-full sm:w-auto" onClick={() => void tell(t('missingVotes.message', { names: list, trip: trip.name }))}>
        {t('missingVotes.remind')}
      </Button>
    </section>
  )
}
