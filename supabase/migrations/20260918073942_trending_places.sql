-- ── "Le mete del momento": what groups on Roamie propose and choose, published anonymously ──
-- Recomputed once a day into a small public table. Only places found through the place search (with a country and
-- coordinates) in trips with at least 2 members count, and a place is published only once 3 different trips of 3
-- different owners proposed it in the last 90 days, so no row can point to one group. Nothing else is published:
-- no trips, people or free text other than the place's most common name.

create table public.trending_places (
  rank int primary key,
  name text not null,
  country text,
  country_code text not null,
  image_url text,
  image_attribution text,
  trips int not null,
  chosen int not null,
  refreshed_at timestamptz not null default now()
);
alter table public.trending_places enable row level security;
revoke all on public.trending_places from anon, authenticated;
grant select on public.trending_places to anon, authenticated;
create policy "trending_places: public" on public.trending_places for select to anon, authenticated using (true);

create or replace function public.refresh_trending_places()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.trending_places where true;
  insert into public.trending_places (rank, name, country, country_code, image_url, image_attribution, trips, chosen)
  select row_number() over (order by c.chosen desc, c.trips desc, c.name),
         c.name, c.country, c.country_code, c.image_url, c.image_attribution, c.trips, c.chosen
    from (
      select d.country_code,
             count(distinct d.trip_id)::int as trips,
             count(distinct t.owner_id) as owners,
             (count(distinct d.trip_id) filter (where d.status in ('selected', 'visited')))::int as chosen,
             mode() within group (order by btrim(d.name)) as name,
             mode() within group (order by d.country) as country,
             (array_agg(d.image_url order by d.created_at desc) filter (where d.image_url like 'https://%'))[1] as image_url,
             (array_agg(d.image_attribution order by d.created_at desc) filter (where d.image_url like 'https://%'))[1] as image_attribution
        from public.destinations d
        join public.trips t on t.id = d.trip_id
       where d.country_code is not null
         and d.lat is not null
         and d.lng is not null
         and d.created_at > now() - interval '90 days'
         and (select count(*) from public.trip_members m where m.trip_id = d.trip_id) >= 2
       -- The same place, whatever language it was written in: same country, coordinates within about 10 km.
       group by d.country_code, round(d.lat::numeric, 1), round(d.lng::numeric, 1)
    ) c
   where c.trips >= 3 and c.owners >= 3
   order by 1
   limit 24;
end;
$$;
revoke execute on function public.refresh_trending_places() from public, anon, authenticated;

select public.refresh_trending_places();

do $$
begin
  -- Hosted database only: the local test harness has no pg_cron.
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    execute $cron$select cron.schedule('trending-places', '20 4 * * *', 'select public.refresh_trending_places()')$cron$;
  end if;
end;
$$;
