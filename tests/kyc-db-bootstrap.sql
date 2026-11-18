-- Only for the isolated disposable cluster created by test-kyc-db.ps1.
do $$ begin
  if current_database() <> 'party_link_kyc_test' then raise exception 'Use a disposable test database'; end if;
end $$;
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Relevant existing schema, including the columns the migration must preserve.
create table public.profiles (
  id uuid primary key, email text not null default '', name text not null,
  role text not null default 'client', phone text, host_name text, avatar_url text
);
create table public.event (event_id uuid primary key default gen_random_uuid(), host_id uuid references public.profiles(id), status text default 'draft');
create table public.reservation (reservation_id uuid primary key default gen_random_uuid(), attendee_id uuid references public.profiles(id));
create table public.reservation_item (reservation_item_id uuid primary key default gen_random_uuid(), reservation_id uuid references public.reservation(reservation_id));

-- Simulate a pre-existing permissive profile policy, which must be removed.
alter table public.profiles enable row level security;
grant all on public.profiles to authenticated;
create policy old_profile_write on public.profiles for all to authenticated using (true) with check (true);
