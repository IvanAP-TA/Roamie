import { useNavigate } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useChecklist, useChecklistMutations } from '@/hooks/usePlan'
import { useTripContext } from '@/hooks/useTripContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const STEPS = ['dates', 'travel', 'stay'] as const

/**
 * What a group does in the week after the wheel, while the decision is still warm: fix the dates, someone on the
 * flights, someone on the place to stay. One tap puts them in the checklist ("to book"), where each gets a name.
 * Steps already in the list (same title) aren't added twice.
 */
export function NextSteps({ onDone, className }: { onDone?: () => void; className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { trip, canEdit } = useTripContext()
  const { data: items } = useChecklist(trip.id)
  const { add } = useChecklistMutations(trip.id)
  const titles = STEPS.map((step) => t(`nextSteps.${step}`))
  const missing = titles.filter((title) => !items?.some((i) => i.title === title))

  const save = async () => {
    try {
      for (const title of missing) await add.mutateAsync({ kind: 'book', title, assignee_id: null })
      onDone?.()
      navigate(`/trips/${trip.id}/itinerary?view=checklist`)
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <section className={cn('rounded-[1.5rem] p-4', className)}>
      <h3 className="text-sm font-bold">{t('nextSteps.title')}</h3>
      <ol className="mt-2 space-y-1.5 text-sm">
        {titles.map((title, i) => (
          <li key={title} className="flex gap-2">
            <span className="font-bold opacity-60">{i + 1}.</span>
            {title}
          </li>
        ))}
      </ol>
      {canEdit && missing.length > 0 && <p className="mt-2 text-xs opacity-75">{t('nextSteps.hint')}</p>}
      {canEdit && missing.length > 0 && (
        <Button size="sm" className="mt-3" onClick={() => void save()} disabled={add.isPending}>
          <ListChecks />
          {t('nextSteps.add')}
        </Button>
      )}
    </section>
  )
}
