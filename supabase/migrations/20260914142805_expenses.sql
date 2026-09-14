-- ════════════════════════════════════════════════════════════════════════════
-- Roamie · 14 · Shared expenses: lists per trip, multi-currency expenses, balances (no payments in the app)
-- ════════════════════════════════════════════════════════════════════════════

-- A trip can have several lists (e.g. one per trip taken together). The currency is fixed at creation:
-- every expense's rate converts into it, so changing it later would silently change every balance.
create table public.expense_lists (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index expense_lists_trip_id_idx on public.expense_lists (trip_id);

-- kind 'transfer' records a reimbursement between two members (paid_by gave the money to the single share).
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.expense_lists (id) on delete cascade,
  kind text not null default 'expense' check (kind in ('expense', 'transfer')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  amount numeric(12, 2) not null check (amount > 0 and amount < 10000000000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- Units of the list currency for one unit of the expense currency.
  rate numeric(20, 10) not null default 1 check (rate > 0),
  paid_by uuid references public.profiles (id) on delete set null,
  spent_on date not null default current_date,
  category text check (category in ('food', 'stay', 'transport', 'activity', 'shopping', 'other')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_list_id_idx on public.expenses (list_id, spent_on desc);
create index expenses_paid_by_idx on public.expenses (paid_by);

-- Who shares an expense, and in what proportion (equal parts are weight 1; exact amounts are the amounts).
create table public.expense_shares (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  weight numeric(14, 4) not null check (weight > 0),
  primary key (expense_id, user_id)
);

create index expense_shares_user_id_idx on public.expense_shares (user_id);

-- ─── Helpers (security definer, like the other RLS helpers) ─────────────────
create or replace function public.expense_list_trip_id(_list_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.trip_id from public.expense_lists l where l.id = _list_id;
$$;

create or replace function public.expense_trip_id(_expense_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.trip_id from public.expenses e join public.expense_lists l on l.id = e.list_id where e.id = _expense_id;
$$;

-- The author of an expense, or the trip's owners and editors.
create or replace function public.can_manage_expense(_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expenses e
     where e.id = _expense_id
       and (e.created_by = (select auth.uid()) or public.can_edit_trip(public.expense_trip_id(e.id)))
  );
$$;

revoke execute on function public.expense_list_trip_id(uuid), public.expense_trip_id(uuid), public.can_manage_expense(uuid) from public, anon;
grant execute on function public.expense_list_trip_id(uuid), public.expense_trip_id(uuid), public.can_manage_expense(uuid) to authenticated;

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.expense_lists enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
revoke all on public.expense_lists, public.expenses, public.expense_shares from anon;
revoke update on public.expense_lists, public.expenses, public.expense_shares from authenticated;
grant update (name) on public.expense_lists to authenticated;
grant update (kind, title, amount, currency, rate, paid_by, spent_on, category, updated_at) on public.expenses to authenticated;

create policy "expense_lists: members can read" on public.expense_lists for select to authenticated
  using (public.is_trip_member(trip_id));
create policy "expense_lists: members create" on public.expense_lists for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_trip_member(trip_id));
create policy "expense_lists: author or editors rename" on public.expense_lists for update to authenticated
  using (created_by = (select auth.uid()) or public.can_edit_trip(trip_id))
  with check (public.is_trip_member(trip_id));
create policy "expense_lists: author or editors delete" on public.expense_lists for delete to authenticated
  using (created_by = (select auth.uid()) or public.can_edit_trip(trip_id));

create policy "expenses: members can read" on public.expenses for select to authenticated
  using (public.is_trip_member(public.expense_list_trip_id(list_id)));
create policy "expenses: members add, paid by a member" on public.expenses for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.is_trip_member(public.expense_list_trip_id(list_id))
    and paid_by is not null
    and public.is_member_of_trip(public.expense_list_trip_id(list_id), paid_by)
  );
create policy "expenses: author or editors change" on public.expenses for update to authenticated
  using (public.can_manage_expense(id))
  with check (paid_by is not null and public.is_member_of_trip(public.expense_list_trip_id(list_id), paid_by));
create policy "expenses: author or editors delete" on public.expenses for delete to authenticated
  using (public.can_manage_expense(id));

create policy "expense_shares: members can read" on public.expense_shares for select to authenticated
  using (public.is_trip_member(public.expense_trip_id(expense_id)));
create policy "expense_shares: split among members" on public.expense_shares for insert to authenticated
  with check (
    public.can_manage_expense(expense_id)
    and public.is_member_of_trip(public.expense_trip_id(expense_id), user_id)
  );
create policy "expense_shares: author or editors remove" on public.expense_shares for delete to authenticated
  using (public.can_manage_expense(expense_id));

-- ─── Save an expense and its split in one transaction ───────────────────────
-- Creates (p_expense_id null) or replaces an expense and all its shares. Runs as the caller: RLS applies.
create or replace function public.save_expense(
  p_list_id uuid,
  p_kind text,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_rate numeric,
  p_paid_by uuid,
  p_spent_on date,
  p_shares jsonb,
  p_category text default null,
  p_expense_id uuid default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_shares is null or jsonb_typeof(p_shares) <> 'array'
     or jsonb_array_length(p_shares) = 0 or jsonb_array_length(p_shares) > 100 then
    raise exception 'invalid_shares' using errcode = '22023';
  end if;
  if p_kind = 'transfer' and (jsonb_array_length(p_shares) <> 1 or (p_shares -> 0 ->> 'user_id')::uuid = p_paid_by) then
    raise exception 'invalid_transfer' using errcode = '22023';
  end if;

  if p_expense_id is null then
    insert into public.expenses (list_id, kind, title, amount, currency, rate, paid_by, spent_on, category)
    values (p_list_id, p_kind, btrim(p_title), p_amount, p_currency, p_rate, p_paid_by, coalesce(p_spent_on, current_date), p_category)
    returning id into v_id;
  else
    update public.expenses
       set kind = p_kind, title = btrim(p_title), amount = p_amount, currency = p_currency, rate = p_rate,
           paid_by = p_paid_by, spent_on = coalesce(p_spent_on, current_date), category = p_category, updated_at = now()
     where id = p_expense_id and list_id = p_list_id
    returning id into v_id;
    if v_id is null then
      raise exception 'expense_not_found' using errcode = 'P0002';
    end if;
    delete from public.expense_shares where expense_id = v_id;
  end if;

  insert into public.expense_shares (expense_id, user_id, weight)
  select v_id, (share ->> 'user_id')::uuid, (share ->> 'weight')::numeric
    from jsonb_array_elements(p_shares) as share;

  return v_id;
end;
$$;

revoke execute on function public.save_expense(uuid, text, text, numeric, text, numeric, uuid, date, jsonb, text, uuid) from public, anon;
grant execute on function public.save_expense(uuid, text, text, numeric, text, numeric, uuid, date, jsonb, text, uuid) to authenticated;

alter publication supabase_realtime add table public.expense_lists, public.expenses;
