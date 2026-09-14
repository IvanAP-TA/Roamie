import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, Check, ChevronRight, MoreHorizontal, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useExpenseLists, useExpenseMutations } from '@/hooks/useExpenses'
import { useTripContext } from '@/hooks/useTripContext'
import { formatMoney } from '@/lib/currency'
import { balances, convertedCents, settle, shareCents, spentBy, toCents, totalSpent, type Expense, type ExpenseList, type Transfer } from '@/lib/expenses'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/misc'
import { CategoryIcon, ExpenseFormSheet, type ExpensePrefill } from './ExpenseFormSheet'
import { ExpenseListSheet } from './ExpenseListSheet'

const today = () => new Date().toISOString().slice(0, 10)

function useMoney() {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  return (cents: number, currency: string) => formatMoney(cents, currency, lang)
}

function useNames() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { members } = useTripContext()
  const member = (id: string | null | undefined) => members.find((m) => m.user_id === id)
  return {
    nameOf: (id: string | null | undefined) =>
      id && id === user?.id ? t('expenses.you') : (member(id)?.profile?.display_name?.split(' ')[0] ?? t('expenses.formerMember')),
    profileOf: (id: string | null | undefined) => member(id)?.profile ?? null,
  }
}

function BalanceText({ cents, currency, className }: { cents: number; currency: string; className?: string }) {
  const { t } = useTranslation()
  const money = useMoney()
  return (
    <span className={cn('text-sm font-semibold tabular-nums', cents > 0 && 'text-sage', cents < 0 && 'text-destructive', className)}>
      {cents > 0
        ? t('expenses.owedToYou', { amount: money(cents, currency) })
        : cents < 0
          ? t('expenses.youOwe', { amount: money(-cents, currency) })
          : t('expenses.even')}
    </span>
  )
}

/** Shared expenses in the trip plan: the lists, then one list's expenses and balances (?list=). */
export function ExpensesSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { trip } = useTripContext()
  const money = useMoney()
  const { data: lists, isLoading } = useExpenseLists(trip.id)
  const [params, setParams] = useSearchParams()
  const [listForm, setListForm] = useState<{ open: boolean; list: ExpenseList | null }>({ open: false, list: null })

  const list = lists?.find((l) => l.id === params.get('list')) ?? null
  const openList = (id: string | null) =>
    setParams((p) => {
      if (id) p.set('list', id)
      else p.delete('list')
      return p
    })

  if (isLoading) return <Skeleton className="h-56 rounded-[2rem]" />

  return (
    <>
      {list ? (
        <ListDetail list={list} onBack={() => openList(null)} onRename={() => setListForm({ open: true, list })} />
      ) : lists && lists.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl">{t('expenses.lists')}</h2>
            <Button size="sm" onClick={() => setListForm({ open: true, list: null })}>
              <Plus />
              {t('expenses.newList')}
            </Button>
          </div>
          <ul className="space-y-2">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  onClick={() => openList(l.id)}
                  className="glass flex w-full items-center gap-4 rounded-[1.75rem] p-4 text-left transition hover:bg-foreground/[0.03]"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <Wallet className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xl leading-tight">{l.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t('expenses.countExpenses', { count: l.expenses.filter((e) => e.kind === 'expense').length })} · {money(totalSpent(l.expenses), l.currency)}
                    </span>
                    {user && <BalanceText cents={balances(l.expenses).get(user.id) ?? 0} currency={l.currency} className="mt-0.5 block text-xs" />}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="glass space-y-4 rounded-[2rem] p-6">
          <Wallet className="size-8 text-primary" />
          <div>
            <h2 className="text-2xl">{t('expenses.emptyTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('expenses.emptyBody')}</p>
          </div>
          <Button size="lg" onClick={() => setListForm({ open: true, list: null })}>
            <Plus />
            {t('expenses.newList')}
          </Button>
        </section>
      )}

      <ExpenseListSheet
        open={listForm.open}
        list={listForm.list}
        onOpenChange={(open) => setListForm((f) => ({ ...f, open }))}
        onCreated={(id) => openList(id)}
      />
    </>
  )
}

function ListDetail({ list, onBack, onRename }: { list: ExpenseList; onBack: () => void; onRename: () => void }) {
  const { t, i18n } = useTranslation()
  const money = useMoney()
  const { user } = useAuth()
  const { trip, members, canEdit } = useTripContext()
  const m = useExpenseMutations(trip.id)
  const { nameOf, profileOf } = useNames()
  const [tab, setTab] = useState<'expenses' | 'balances'>('expenses')
  const [form, setForm] = useState<{ open: boolean; expense: Expense | null; prefill: ExpensePrefill }>({
    open: false,
    expense: null,
    prefill: { kind: 'expense' },
  })
  const [deletingList, setDeletingList] = useState(false)

  const balance = useMemo(() => balances(list.expenses), [list.expenses])
  const transfers = useMemo(() => settle(balance), [balance])
  const groups = useMemo(() => {
    const byDay = new Map<string, Expense[]>()
    for (const e of list.expenses) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e])
    return [...byDay]
  }, [list.expenses])
  const people = useMemo(() => {
    const ids = [...new Set([...members.map((mb) => mb.user_id), ...balance.keys()])]
    return ids.sort((a, b) => (balance.get(b) ?? 0) - (balance.get(a) ?? 0))
  }, [members, balance])
  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }),
    [i18n.resolvedLanguage],
  )

  const canManageList = list.created_by === user?.id || canEdit
  const canManage = (e: Expense) => e.created_by === user?.id || canEdit
  const mine = user ? (balance.get(user.id) ?? 0) : 0

  const markPaid = (transfer: Transfer) =>
    m.saveExpense.mutate(
      {
        listId: list.id,
        input: {
          kind: 'transfer',
          title: t('expenses.reimbursement'),
          amount: transfer.cents / 100,
          currency: list.currency,
          rate: 1,
          paid_by: transfer.from,
          spent_on: today(),
          category: null,
          shares: [{ user_id: transfer.to, weight: 1 }],
        },
      },
      { onSuccess: () => toast.success(t('expenses.markedPaid')), onError: () => toast.error(t('errors.generic')) },
    )

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label={t('expenses.back')} onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl leading-tight">{list.name}</h2>
          <p className="text-xs text-muted-foreground">{list.currency}</p>
        </div>
        {canManageList && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('expenses.listActions')}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onRename}>
                <Pencil />
                {t('expenses.renameList')}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={() => setDeletingList(true)}>
                <Trash2 />
                {t('expenses.deleteList')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t('expenses.total'), value: money(totalSpent(list.expenses), list.currency) },
          { label: t('expenses.yourSpending'), value: user ? money(spentBy(list.expenses, user.id), list.currency) : '—' },
        ].map((tile) => (
          <div key={tile.label} className="glass rounded-[1.25rem] p-3">
            <p className="text-[0.7rem] text-muted-foreground">{tile.label}</p>
            <p className="mt-1 truncate font-semibold tabular-nums">{tile.value}</p>
          </div>
        ))}
        <div className="glass rounded-[1.25rem] p-3">
          <p className="text-[0.7rem] text-muted-foreground">{t('expenses.yourBalance')}</p>
          <BalanceText cents={mine} currency={list.currency} className="mt-1 block truncate" />
        </div>
      </div>

      <div role="tablist" className="flex gap-1 rounded-full bg-foreground/[0.05] p-1">
        {(['expenses', 'balances'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            onClick={() => setTab(option)}
            className={cn(
              'min-h-10 flex-1 rounded-full text-sm font-semibold transition-colors',
              tab === option ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(option === 'expenses' ? 'expenses.tabExpenses' : 'expenses.tabBalances')}
          </button>
        ))}
      </div>

      {tab === 'expenses' ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setForm({ open: true, expense: null, prefill: { kind: 'expense' } })}>
              <Plus />
              {t('expenses.addExpense')}
            </Button>
            <Button variant="glass" onClick={() => setForm({ open: true, expense: null, prefill: { kind: 'transfer' } })}>
              <ArrowRightLeft />
              {t('expenses.addTransfer')}
            </Button>
          </div>

          {groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('expenses.noExpenses')}</p>
          ) : (
            groups.map(([day, expenses]) => (
              <section key={day} className="space-y-1.5">
                <h3 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{dayFormat.format(new Date(`${day}T00:00:00Z`))}</h3>
                <ul className="glass divide-y divide-border overflow-hidden rounded-[1.5rem]">
                  {expenses.map((e) => {
                    const myPart = user && e.kind === 'expense' ? shareCents(e).get(user.id) : undefined
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          disabled={!canManage(e)}
                          onClick={() => setForm({ open: true, expense: e, prefill: { kind: e.kind } })}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition enabled:hover:bg-foreground/[0.03]"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06]">
                            {e.kind === 'transfer' ? <ArrowRightLeft className="size-4" /> : <CategoryIcon category={e.category} className="size-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{e.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {e.kind === 'transfer'
                                ? t('expenses.transferLine', { from: nameOf(e.paid_by), to: nameOf(e.expense_shares[0]?.user_id) })
                                : t('expenses.paidBy', { name: nameOf(e.paid_by) })}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block font-semibold tabular-nums">{money(convertedCents(e), list.currency)}</span>
                            {e.currency !== list.currency && (
                              <span className="block text-xs text-muted-foreground tabular-nums">{money(toCents(e.amount), e.currency)}</span>
                            )}
                            {myPart !== undefined && (
                              <span className="block text-xs text-muted-foreground tabular-nums">{t('expenses.yourShare', { amount: money(myPart, list.currency) })}</span>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <ul className="glass divide-y divide-border rounded-[1.75rem]">
            {people.map((id) => {
              const cents = balance.get(id) ?? 0
              return (
                <li key={id} className="flex items-center gap-3 px-4 py-3">
                  <UserAvatar profile={profileOf(id)} className="size-9" />
                  <span className="min-w-0 flex-1 truncate font-medium">{nameOf(id)}</span>
                  <span className={cn('text-sm font-semibold tabular-nums', cents > 0 && 'text-sage', cents < 0 && 'text-destructive')}>
                    {cents > 0
                      ? t('expenses.receives', { amount: money(cents, list.currency) })
                      : cents < 0
                        ? t('expenses.owes', { amount: money(-cents, list.currency) })
                        : t('expenses.settled')}
                  </span>
                </li>
              )
            })}
          </ul>

          <section className="space-y-2">
            <h3 className="text-xl">{t('expenses.settleTitle')}</h3>
            {transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('expenses.settleEmpty')}</p>
            ) : (
              <ul className="space-y-2">
                {transfers.map((transfer) => (
                  <li key={`${transfer.from}-${transfer.to}`} className="glass flex flex-wrap items-center gap-3 rounded-[1.5rem] p-4">
                    <span className="min-w-0 flex-1 text-sm">
                      {t('expenses.transferSuggestion', { from: nameOf(transfer.from), to: nameOf(transfer.to), amount: money(transfer.cents, list.currency) })}
                    </span>
                    <Button size="sm" variant="outline" disabled={m.saveExpense.isPending} onClick={() => markPaid(transfer)}>
                      <Check />
                      {t('expenses.markPaid')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">{t('expenses.noPayments')}</p>
          </section>
        </div>
      )}

      <ExpenseFormSheet
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        list={list}
        expense={form.expense}
        prefill={form.prefill}
      />

      <ConfirmDialog
        open={deletingList}
        onOpenChange={setDeletingList}
        title={t('expenses.deleteListTitle', { name: list.name })}
        description={t('expenses.deleteListBody')}
        confirmLabel={t('expenses.deleteList')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={async () => {
          try {
            await m.deleteList.mutateAsync(list.id)
            onBack()
          } catch {
            toast.error(t('errors.generic'))
          }
        }}
      />
    </div>
  )
}
