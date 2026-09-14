import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Expense, ExpenseCategory, ExpenseList, ExpenseShare } from '@/lib/expenses'
import { supabase } from '@/lib/supabase'
import { keys, unwrap } from './useTrips'

const LIST_SELECT =
  'id, trip_id, name, currency, created_by, created_at, expenses(id, list_id, kind, title, amount, currency, rate, paid_by, spent_on, category, created_by, created_at, expense_shares(user_id, weight))'

/** Every expense list of the trip with its expenses and splits (newest expenses first). */
export function useExpenseLists(tripId: string) {
  return useQuery({
    queryKey: keys.expenses(tripId),
    queryFn: async () =>
      unwrap<ExpenseList[]>(
        await supabase
          .from('expense_lists')
          .select(LIST_SELECT)
          .eq('trip_id', tripId)
          .order('created_at')
          .order('spent_on', { referencedTable: 'expenses', ascending: false })
          .order('created_at', { referencedTable: 'expenses', ascending: false }),
      ).map((list) => ({
        ...list,
        // numeric columns can arrive as strings: normalise once here.
        expenses: list.expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
          rate: Number(e.rate),
          expense_shares: e.expense_shares.map((s) => ({ ...s, weight: Number(s.weight) })),
        })),
      })),
  })
}

export interface ExpenseInput {
  kind: Expense['kind']
  title: string
  amount: number
  currency: string
  rate: number
  paid_by: string
  spent_on: string
  category: ExpenseCategory | null
  shares: ExpenseShare[]
}

export function useExpenseMutations(tripId: string) {
  const qc = useQueryClient()
  const key = keys.expenses(tripId)
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const createList = useMutation({
    mutationFn: async ({ name, currency }: { name: string; currency: string }) =>
      unwrap<{ id: string }>(await supabase.from('expense_lists').insert({ trip_id: tripId, name, currency }).select('id').single()),
    onSettled: refresh,
  })

  const renameList = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      unwrap(await supabase.from('expense_lists').update({ name }).eq('id', id))
    },
    onSettled: refresh,
  })

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const rows = unwrap<{ id: string }[]>(await supabase.from('expense_lists').delete().eq('id', id).select('id'))
      if (rows.length === 0) throw new Error('forbidden')
    },
    onSettled: refresh,
  })

  const saveExpense = useMutation({
    mutationFn: async ({ listId, expenseId, input }: { listId: string; expenseId?: string; input: ExpenseInput }) =>
      unwrap<string>(
        await supabase.rpc('save_expense', {
          p_list_id: listId,
          p_kind: input.kind,
          p_title: input.title,
          p_amount: input.amount,
          p_currency: input.currency,
          p_rate: input.rate,
          p_paid_by: input.paid_by,
          p_spent_on: input.spent_on,
          p_shares: input.shares.map((s) => ({ user_id: s.user_id, weight: s.weight })),
          ...(input.category && { p_category: input.category }),
          ...(expenseId && { p_expense_id: expenseId }),
        }),
      ),
    onSettled: refresh,
  })

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const rows = unwrap<{ id: string }[]>(await supabase.from('expenses').delete().eq('id', id).select('id'))
      if (rows.length === 0) throw new Error('forbidden')
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ExpenseList[]>(key)
      qc.setQueryData<ExpenseList[]>(key, (lists) => lists?.map((l) => ({ ...l, expenses: l.expenses.filter((e) => e.id !== id) })))
      return { previous }
    },
    onError: (_e, _id, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: refresh,
  })

  return { createList, renameList, deleteList, saveExpense, deleteExpense }
}
