begin;

create type public.verification_tier as enum ('basic', 'verified_guest', 'verified_host');

-- Preserve the existing profile/contact/role fields used by the dashboard.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default ''
);
alter table public.profiles
  add column date_of_birth date,
  add column tier public.verification_tier not null default 'basic',
  add column identity_status text not null default 'none'
    check (identity_status in ('none', 'pending', 'verified', 'failed')),
  add column identity_ref text,
  add column verified_at timestamptz,
  -- Capture the original agreement version, independent of mutable auth metadata.
  add column signup_consent_version text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and confrelid = 'auth.users'::regclass
      and contype = 'f' and confdeltype = 'c'
  ) then
    alter table public.profiles add constraint profiles_auth_user_fk
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document text not null check (document in ('terms', 'privacy', 'host_agreement')),
  version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, document, version)
);

alter table public.profiles enable row level security;
alter table public.consents enable row level security;

-- Remove legacy permissive policies: a user must never write their own tier/DOB.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('profiles', 'consents')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

revoke all on public.profiles, public.consents from anon, authenticated;
grant select on public.profiles, public.consents to authenticated;
grant all on public.profiles, public.consents to service_role;
create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy consents_select_own on public.consents for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare dob date;
begin
  -- This also protects direct Auth API signups that bypass the Next.js form.
  if coalesce(new.raw_user_meta_data->>'date_of_birth', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'A valid date of birth is required';
  end if;
  dob := (new.raw_user_meta_data->>'date_of_birth')::date;
  if dob > (current_date - interval '18 years')::date then
    raise exception 'You must be 18 or older';
  end if;
  if new.raw_user_meta_data->>'accept_terms' is distinct from 'true'
    or new.raw_user_meta_data->>'consent_version' is distinct from '2026-01' then
    raise exception 'Accept the current terms and privacy notice';
  end if;
  insert into public.profiles (id, email, name, date_of_birth, signup_consent_version)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'name', ''), dob, '2026-01')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Legacy accounts deliberately keep a NULL DOB and no consent evidence. Do not
-- invent an age or consent for them; see the README's legacy-account procedure.
commit;
