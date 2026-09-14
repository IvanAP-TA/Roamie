import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useExpenseMutations } from '@/hooks/useExpenses'
import { useTripContext } from '@/hooks/useTripContext'
import { currencyOptions, type CurrencyOption } from '@/lib/currency'
import type { ExpenseList } from '@/lib/expenses'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'

export const selectClass =
  'h-12 w-full rounded-2xl border border-input bg-background px-3 text-base font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function CurrencySelect({
  id,
  value,
  onChange,
  options,
  className,
}: {
  id?: string
  value: string
  onChange: (code: string) => void
  options: { common: CurrencyOption[]; rest: CurrencyOption[] }
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(selectClass, className)}>
      <optgroup label={t('expenses.commonCurrencies')}>
        {options.common.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </optgroup>
      <optgroup label={t('expenses.allCurrencies')}>
        {options.rest.map((o) => (
          <option key={o.code} value={o.code}>
            {o.label}
          </option>
        ))}
      </optgroup>
    </select>
  )
}

/** Create a list (name + fixed currency) or rename one. */
export function ExpenseListSheet({
  open,
  onOpenChange,
  list,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: ExpenseList | null
  onCreated?: (id: string) => void
}) {
  const { t, i18n } = useTranslation()
  const { trip } = useTripContext()
  const m = useExpenseMutations(trip.id)
  const options = useMemo(() => currencyOptions(i18n.resolvedLanguage ?? 'en'), [i18n.resolvedLanguage])
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const busy = m.createList.isPending || m.renameList.isPending

  useEffect(() => {
    if (!open) return
    setName(list?.name ?? '')
    setCurrency(list?.currency ?? 'EUR')
  }, [open, list])

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    const onError = () => toast.error(t('errors.generic'))
    if (list) {
      m.renameList.mutate({ id: list.id, name: trimmed }, { onSuccess: () => onOpenChange(false), onError })
    } else {
      m.createList.mutate(
        { name: trimmed, currency },
        {
          onSuccess: ({ id }) => {
            onOpenChange(false)
            toast.success(t('expenses.listCreated'))
            onCreated?.(id)
          },
          onError,
        },
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={list ? t('expenses.renameList') : t('expenses.newList')}
      footer={
        <Button size="lg" className="w-full" disabled={!name.trim() || busy} onClick={save}>
          {busy && <Loader2 className="animate-spin" />}
          {t('expenses.save')}
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <label className="block space-y-1.5 text-sm font-semibold">
          <span className="block">{t('expenses.listName')}</span>
          <Input value={name} maxLength={80} placeholder={t('expenses.listNamePlaceholder')} onChange={(e) => setName(e.target.value)} />
        </label>
        {!list && (
          <label className="block space-y-1.5 text-sm font-semibold">
            <span className="block">{t('expenses.currency')}</span>
            <CurrencySelect value={currency} onChange={setCurrency} options={options} />
            <span className="block text-xs font-normal text-muted-foreground">{t('expenses.currencyHint')}</span>
          </label>
        )}
      </div>
    </Sheet>
  )
}
