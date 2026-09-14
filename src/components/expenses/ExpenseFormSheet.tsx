import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BedDouble, Bus, Check, Loader2, ReceiptText, Shapes, ShoppingBag, Ticket, Trash2, Utensils, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useExpenseMutations } from '@/hooks/useExpenses'
import { useTripContext } from '@/hooks/useTripContext'
import { amountInput, currencyOptions, formatMoney, parseAmount, parseRate } from '@/lib/currency'
import { EXPENSE_CATEGORIES, shareCents, toCents, type Expense, type ExpenseCategory, type ExpenseList, type ExpenseShare } from '@/lib/expenses'
import { fetchRate } from '@/lib/fx'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { CurrencySelect, selectClass } from './ExpenseListSheet'

const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  food: Utensils,
  stay: BedDouble,
  transport: Bus,
  activity: Ticket,
  shopping: ShoppingBag,
  other: Shapes,
}

export function CategoryIcon({ category, className }: { category: ExpenseCategory | null; className?: string }) {
  const Icon = category ? CATEGORY_ICONS[category] : ReceiptText
  return <Icon className={className} />
}

export interface ExpensePrefill {
  kind: Expense['kind']
  from?: string
  to?: string
  cents?: number
}

type SplitMode = 'equal' | 'amounts'
type RateState = 'idle' | 'loading' | 'auto' | 'unavailable'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold">
      <span className="block">{label}</span>
      {children}
    </label>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

/** Add or edit an expense (who paid, currency and rate, how it's split) or a reimbursement between two members. */
export function ExpenseFormSheet({
  open,
  onOpenChange,
  list,
  expense,
  prefill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: ExpenseList
  expense: Expense | null
  prefill: ExpensePrefill
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  const { user } = useAuth()
  const { trip, members, canEdit } = useTripContext()
  const m = useExpenseMutations(trip.id)
  const options = useMemo(() => currencyOptions(lang), [lang])
  const kind = expense?.kind ?? prefill.kind
  const money = (cents: number, currency: string) => formatMoney(cents, currency, lang)

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(list.currency)
  const [rateText, setRateText] = useState('1')
  const [rateTouched, setRateTouched] = useState(false)
  const [rateState, setRateState] = useState<RateState>('idle')
  const [paidBy, setPaidBy] = useState('')
  const [to, setTo] = useState('')
  const [spentOn, setSpentOn] = useState(today())
  const [category, setCategory] = useState<ExpenseCategory | null>(null)
  const [mode, setMode] = useState<SplitMode>('equal')
  const [selected, setSelected] = useState<string[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    const memberIds = members.map((member) => member.user_id)
    if (expense) {
      const equal = expense.expense_shares.every((s) => s.weight === 1)
      setTitle(expense.title)
      setAmount(amountInput(expense.amount, lang))
      setCurrency(expense.currency)
      setRateText(String(expense.rate))
      setRateTouched(true)
      setRateState('idle')
      setPaidBy(expense.paid_by ?? user?.id ?? '')
      setTo(expense.kind === 'transfer' ? (expense.expense_shares[0]?.user_id ?? '') : '')
      setSpentOn(expense.spent_on)
      setCategory(expense.category)
      setMode(equal ? 'equal' : 'amounts')
      setSelected(expense.expense_shares.map((s) => s.user_id))
      setAmounts(equal ? {} : Object.fromEntries(expense.expense_shares.map((s) => [s.user_id, amountInput(s.weight, lang)])))
    } else {
      setTitle('')
      setAmount(prefill.cents ? amountInput(prefill.cents / 100, lang) : '')
      setCurrency(list.currency)
      setRateText('1')
      setRateTouched(false)
      setRateState('idle')
      setPaidBy(prefill.from ?? user?.id ?? memberIds[0] ?? '')
      setTo(prefill.to ?? '')
      setSpentOn(today())
      setCategory(null)
      setMode('equal')
      setSelected(memberIds)
      setAmounts({})
    }
  }, [open, expense, prefill]) // eslint-disable-line react-hooks/exhaustive-deps -- reset only when the sheet opens

  // Propose the ECB rate for the expense date, unless the user typed their own.
  useEffect(() => {
    if (!open) return
    if (currency === list.currency) {
      setRateText('1')
      setRateState('idle')
      return
    }
    if (rateTouched) return
    const controller = new AbortController()
    setRateState('loading')
    fetchRate(currency, list.currency, spentOn, controller.signal).then(
      (rate) => {
        if (rate) {
          setRateText(String(rate))
          setRateState('auto')
        } else {
          setRateState('unavailable')
        }
      },
      (error: Error) => error.name !== 'AbortError' && setRateState('unavailable'),
    )
    return () => controller.abort()
  }, [open, currency, spentOn, list.currency, rateTouched])

  const nameOf = (userId: string) => members.find((member) => member.user_id === userId)?.profile?.display_name ?? t('group.unknown')

  const amountValue = parseAmount(amount)
  const rate = currency === list.currency ? 1 : parseRate(rateText)
  const amountCents = amountValue ? toCents(amountValue) : 0
  const convertedTotal = amountValue && rate ? Math.round(amountCents * rate) : 0
  const amountsSum = selected.reduce((sum, id) => sum + toCents(parseAmount(amounts[id] ?? '') ?? 0), 0)

  const shares: ExpenseShare[] =
    kind === 'transfer'
      ? to
        ? [{ user_id: to, weight: 1 }]
        : []
      : mode === 'equal'
        ? selected.map((id) => ({ user_id: id, weight: 1 }))
        : selected.map((id) => ({ user_id: id, weight: parseAmount(amounts[id] ?? '') ?? 0 })).filter((s) => s.weight > 0)

  const equalPreview = kind === 'expense' && mode === 'equal' && amountValue && rate ? shareCents({ amount: amountValue, rate, expense_shares: shares }) : null

  const splitValid =
    kind === 'transfer'
      ? Boolean(to) && to !== paidBy
      : mode === 'equal'
        ? selected.length > 0
        : shares.length > 0 && amountsSum === amountCents
  const titleValue = title.trim() || (kind === 'transfer' ? t('expenses.reimbursement') : '')
  const valid = Boolean(amountValue && rate && paidBy && titleValue && splitValid && /^\d{4}-\d{2}-\d{2}$/.test(spentOn))
  const canDelete = expense !== null && (expense.created_by === user?.id || canEdit)

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const save = () => {
    if (!valid || m.saveExpense.isPending) return
    m.saveExpense.mutate(
      {
        listId: list.id,
        expenseId: expense?.id,
        input: {
          kind,
          title: titleValue.slice(0, 120),
          amount: amountValue!,
          currency,
          rate: rate!,
          paid_by: paidBy,
          spent_on: spentOn,
          category: kind === 'transfer' ? null : category,
          shares,
        },
      },
      {
        onSuccess: () => {
          toast.success(t(kind === 'transfer' ? 'expenses.transferSaved' : 'expenses.expenseSaved'))
          onOpenChange(false)
        },
        onError: () => toast.error(t('errors.generic')),
      },
    )
  }

  const heading = expense
    ? t(kind === 'transfer' ? 'expenses.editTransfer' : 'expenses.editExpense')
    : t(kind === 'transfer' ? 'expenses.newTransfer' : 'expenses.newExpense')

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title={heading}
        footer={
          <div className="flex gap-2">
            {canDelete && (
              <Button variant="ghost" size="lg" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 />
                {t('expenses.delete')}
              </Button>
            )}
            <Button size="lg" className="flex-1" disabled={!valid || m.saveExpense.isPending} onClick={save}>
              {m.saveExpense.isPending && <Loader2 className="animate-spin" />}
              {t('expenses.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pb-2">
          {kind === 'expense' && (
            <Field label={t('expenses.title')}>
              <Input value={title} maxLength={120} placeholder={t('expenses.titlePlaceholder')} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          )}

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Field label={t('expenses.amount')}>
              <Input inputMode="decimal" value={amount} placeholder="0,00" onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t('expenses.currency')}>
              <CurrencySelect
                value={currency}
                onChange={(code) => {
                  setCurrency(code)
                  setRateTouched(false)
                }}
                options={options}
                className="w-28"
              />
            </Field>
          </div>

          {currency !== list.currency && (
            <div className="space-y-2 rounded-[1.25rem] bg-foreground/[0.04] p-3">
              <Field label={t('expenses.rate', { from: currency, to: list.currency })}>
                <Input
                  inputMode="decimal"
                  value={rateText}
                  onChange={(e) => {
                    setRateText(e.target.value)
                    setRateTouched(true)
                  }}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                {rateState === 'loading' && t('expenses.rateLoading')}
                {rateState === 'auto' && t('expenses.rateSource')}
                {rateState === 'unavailable' && t('expenses.rateUnavailable')}
                {convertedTotal > 0 && ` ${t('expenses.converted', { amount: money(convertedTotal, list.currency) })}`}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label={kind === 'transfer' ? t('expenses.from') : t('expenses.payer')}>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={selectClass}>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {nameOf(member.user_id)}
                  </option>
                ))}
              </select>
            </Field>
            {kind === 'transfer' ? (
              <Field label={t('expenses.to')}>
                <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass}>
                  <option value="" disabled>
                    {t('expenses.choose')}
                  </option>
                  {members
                    .filter((member) => member.user_id !== paidBy)
                    .map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {nameOf(member.user_id)}
                      </option>
                    ))}
                </select>
              </Field>
            ) : (
              <Field label={t('expenses.date')}>
                <Input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
              </Field>
            )}
          </div>

          {kind === 'transfer' && (
            <Field label={t('expenses.date')}>
              <Input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
            </Field>
          )}

          {kind === 'expense' && (
            <>
              <div>
                <p className="mb-1.5 text-sm font-semibold">{t('expenses.category')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <Chip key={c} size="sm" active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                      <CategoryIcon category={c} className="size-3.5" />
                      {t(`expenses.categories.${c}`)}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t('expenses.split')}</p>
                  <div role="radiogroup" aria-label={t('expenses.split')} className="flex gap-1 rounded-full bg-foreground/[0.05] p-1">
                    {(['equal', 'amounts'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={mode === option}
                        onClick={() => setMode(option)}
                        className={cn(
                          'min-h-9 rounded-full px-3 text-xs font-semibold transition-colors',
                          mode === option ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {t(option === 'equal' ? 'expenses.splitEqual' : 'expenses.splitAmounts')}
                      </button>
                    ))}
                  </div>
                </div>

                <ul className="divide-y divide-border rounded-[1.25rem] bg-foreground/[0.03]">
                  {members.map((member) => {
                    const checked = selected.includes(member.user_id)
                    const part = equalPreview?.get(member.user_id)
                    return (
                      <li key={member.user_id} className="flex items-center gap-3 px-3 py-2">
                        <button type="button" role="checkbox" aria-checked={checked} onClick={() => toggle(member.user_id)} className="flex min-h-10 min-w-0 flex-1 items-center gap-3 text-left">
                          <span
                            className={cn(
                              'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                              checked ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/25',
                            )}
                          >
                            {checked && <Check className="size-3.5" />}
                          </span>
                          <UserAvatar profile={member.profile} className="size-7 text-[0.6rem]" />
                          <span className="truncate text-sm font-medium">{nameOf(member.user_id)}</span>
                        </button>
                        {mode === 'equal'
                          ? checked && part !== undefined && <span className="text-sm text-muted-foreground tabular-nums">{money(part, list.currency)}</span>
                          : checked && (
                              <Input
                                inputMode="decimal"
                                aria-label={t('expenses.amountFor', { name: nameOf(member.user_id) })}
                                value={amounts[member.user_id] ?? ''}
                                placeholder="0,00"
                                onChange={(e) => setAmounts((current) => ({ ...current, [member.user_id]: e.target.value }))}
                                className="h-10 w-28 text-right"
                              />
                            )}
                      </li>
                    )
                  })}
                </ul>
                {mode === 'equal' && selected.length === 0 && <p className="text-xs text-destructive">{t('expenses.selectSomeone')}</p>}
                {mode === 'amounts' && amountValue && amountsSum !== amountCents && (
                  <p className="text-xs text-destructive">
                    {amountsSum < amountCents
                      ? t('expenses.remaining', { amount: money(amountCents - amountsSum, currency) })
                      : t('expenses.exceeding', { amount: money(amountsSum - amountCents, currency) })}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </Sheet>

      {expense && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('expenses.deleteTitle', { name: expense.title })}
          description={t('expenses.deleteBody')}
          confirmLabel={t('expenses.delete')}
          cancelLabel={t('common.cancel')}
          destructive
          icon={<Trash2 />}
          onConfirm={async () => {
            try {
              await m.deleteExpense.mutateAsync(expense.id)
              onOpenChange(false)
              toast.success(t('expenses.expenseDeleted'))
            } catch {
              toast.error(t('errors.generic'))
            }
          }}
        />
      )}
    </>
  )
}
