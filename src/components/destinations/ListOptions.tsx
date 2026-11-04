import { useState } from 'react'
import { ArrowDownWideNarrow, Clock, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import type { Destination, Mood } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MOOD_META } from './moods'
import { ResetPointsButton } from './ResetPoints'
import { SecretVotingControl } from './SecretVotingControl'

export type ListSort = 'votes' | 'recent'

/**
 * Everything about how the list is shown, and the vote's settings, behind one "Filters" button: the toolbar keeps the
 * tabs, compare and the way into the deck. A dot on the button says a filter or the other order is on.
 */
export function ListOptions({
  sort,
  onSort,
  moods,
  mood,
  onMood,
  voting,
  destinations,
}: {
  sort: ListSort
  onSort: (sort: ListSort) => void
  /** The moods the places of this tab have: the filter shows only with two or more */
  moods: Mood[]
  mood: Mood | null
  onMood: (mood: Mood | null) => void
  /** The proposed tab: the vote's settings (reset points, secret round) are here too */
  voting: boolean
  destinations: Destination[]
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const active = Boolean(mood) || sort !== 'votes'

  return (
    <>
      <Button variant="glass" onClick={() => setOpen(true)} aria-label={t('listOptions.title')} className="relative">
        <SlidersHorizontal />
        <span className="hidden min-[400px]:inline">{t('listOptions.button')}</span>
        {active && <span aria-hidden className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={t('listOptions.title')}>
        <div className="space-y-6 px-2 pb-4">
          <section className="space-y-2">
            <h3 className="font-sans text-xs font-bold tracking-wide text-primary uppercase">{t('listOptions.sort')}</h3>
            <div className="flex flex-wrap gap-2">
              <Chip active={sort === 'votes'} onClick={() => onSort('votes')}>
                <ArrowDownWideNarrow />
                {t('destination.sortVotes')}
              </Chip>
              <Chip active={sort === 'recent'} onClick={() => onSort('recent')}>
                <Clock />
                {t('destination.sortRecent')}
              </Chip>
            </div>
          </section>

          {moods.length > 1 && (
            <section className="space-y-2">
              <h3 className="font-sans text-xs font-bold tracking-wide text-primary uppercase">{t('listOptions.moods')}</h3>
              <div className="flex flex-wrap gap-2">
                <Chip active={mood === null} onClick={() => onMood(null)}>
                  {t('destination.allMoods')}
                </Chip>
                {moods.map((m) => {
                  const Icon = MOOD_META[m].icon
                  return (
                    <Chip key={m} active={mood === m} onClick={() => onMood(mood === m ? null : m)}>
                      <Icon className={cn(mood !== m && MOOD_META[m].tint)} />
                      {t(`moods.${m}`)}
                    </Chip>
                  )
                })}
              </div>
            </section>
          )}

          {voting && (
            <section className="space-y-2">
              <h3 className="font-sans text-xs font-bold tracking-wide text-primary uppercase">{t('listOptions.voting')}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <ResetPointsButton destinations={destinations} />
                <SecretVotingControl />
              </div>
            </section>
          )}

          <Button className="w-full" onClick={() => setOpen(false)}>
            {t('listOptions.done')}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
