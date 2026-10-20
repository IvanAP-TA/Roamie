import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Loader2, Lock, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { useTripContext } from '@/hooks/useTripContext'
import { unwrap } from '@/hooks/useTrips'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/** public.group_budget(): the group's ceiling only once three have answered, and one's own answer. */
interface GroupBudget {
  members: number
  answered: number
  mine: number | null
  ceiling: number | null
}

const BANDS = [1, 2, 3, 4] as const
const budgetKey = (tripId: string) => ['trip', tripId, 'budget'] as const

/**
 * The secret budget: each member says privately how much they'd spend (a band per person, the whole trip), and the
 * group sees only the ceiling everyone is fine with, once three have answered (migration 20261020210000). For the
 * question nobody wants to ask out loud in the group chat.
 */
export function BudgetPrompt() {
  const { t } = useTranslation()
  const { trip } = useTripContext()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: budgetKey(trip.id),
    queryFn: async () => unwrap<GroupBudget>(await supabase.rpc('group_budget', { p_trip_id: trip.id })),
  })
  const save = useMutation({
    mutationFn: async (band: number | null) => unwrap(await supabase.rpc('set_my_budget', { p_trip_id: trip.id, p_band: band })),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKey(trip.id) }),
    onError: () => toast.error(t('errors.generic')),
  })

  if (!data || data.members < 2) return null
  const status =
    data.ceiling !== null
      ? t('budget.ceiling', { band: t(`budget.bands.${data.ceiling}`) })
      : data.mine !== null
        ? t('budget.waiting', { count: Math.max(0, 3 - data.answered) })
        : t('budget.ask')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="glass flex w-full items-center gap-3 rounded-[1.75rem] p-4 text-left transition hover:bg-foreground/[0.03]">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Wallet className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t('budget.title')}</span>
          <span className="block text-sm text-muted-foreground">{status}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen} title={t('budget.title')} description={t('budget.intro')}>
        <div className="space-y-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {BANDS.map((band) => (
              <Button
                key={band}
                variant={data.mine === band ? 'default' : 'glass'}
                className={cn('h-14 rounded-2xl text-base', data.mine === band && 'shadow-glow')}
                disabled={save.isPending}
                onClick={() => save.mutate(data.mine === band ? null : band)}
                aria-pressed={data.mine === band}
              >
                {save.isPending && save.variables === band ? <Loader2 className="animate-spin" /> : null}
                {t(`budget.bands.${band}`)}
              </Button>
            ))}
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-px size-3.5 shrink-0" />
            {t('budget.privacy')}
          </p>
          <div className="rounded-2xl bg-foreground/[0.04] p-4 text-sm">
            <p className="font-semibold">{data.ceiling !== null ? t('budget.ceiling', { band: t(`budget.bands.${data.ceiling}`) }) : t('budget.hidden')}</p>
            <p className="mt-1 text-muted-foreground">{t('budget.answered', { answered: data.answered, members: data.members })}</p>
          </div>
        </div>
      </Sheet>
    </>
  )
}
