begin;

-- The API uses a trusted Drizzle connection, so it must also call requireApiTier.
-- Restrictive caps AND with every existing permissive policy, including ALL
-- policies configured in the dashboard. They cannot be bypassed by another OR.
alter table public.event enable row level security;
alter table public.reservation enable row level security;
alter table public.reservation_item enable row level security;

create policy kyc_event_create on public.event as restrictive for insert to authenticated
with check (host_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid())
    and p.tier = 'verified_host' and p.date_of_birth <= (current_date - interval '18 years')::date
));
create policy kyc_event_update on public.event as restrictive for update to authenticated
using (host_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.tier = 'verified_host'
))
with check (host_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.tier = 'verified_host'
));

create policy kyc_reservation_create on public.reservation as restrictive for insert to authenticated
with check (attendee_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid())
    and p.tier in ('verified_guest', 'verified_host')
    and p.date_of_birth <= (current_date - interval '18 years')::date
));
create policy kyc_reservation_update on public.reservation as restrictive for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid())
  and p.tier in ('verified_guest', 'verified_host')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid())
  and p.tier in ('verified_guest', 'verified_host')));

create policy kyc_reservation_item_create on public.reservation_item as restrictive for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid())
  and p.tier in ('verified_guest', 'verified_host')));
create policy kyc_reservation_item_update on public.reservation_item as restrictive for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid())
  and p.tier in ('verified_guest', 'verified_host')))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid())
  and p.tier in ('verified_guest', 'verified_host')));

-- No permissive write policies are added: the existing APIs validate ticket
-- prices, capacity and ownership. Direct browser writes remain denied unless
-- the project already has permissive policies (then these tier caps still apply).
-- TODO (messaging table does not exist): add an ownership policy AND a restrictive
-- INSERT policy WITH CHECK (sender_id = auth.uid() AND EXISTS (
--   SELECT 1 FROM public.profiles WHERE id = auth.uid()
--   AND tier IN ('verified_guest', 'verified_host')));
commit;
