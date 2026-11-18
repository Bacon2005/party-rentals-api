begin;
-- Fail before changing anything if legacy profiles are orphaned. Never delete them.
do $$ begin
  if exists (select 1 from public.profiles p left join auth.users u on u.id=p.id where u.id is null) then
    raise exception 'Orphan profiles found. Report and repair them before this migration.';
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname='verification_tier' and typnamespace='public'::regnamespace) then
    create type public.verification_tier as enum ('basic','verified_guest','verified_host');
  end if;
end $$;
alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists tier public.verification_tier not null default 'basic',
  add column if not exists identity_status text not null default 'none' check (identity_status in ('none','pending','verified','failed')),
  add column if not exists verified_at timestamptz,
  add column if not exists is_admin boolean not null default false,
  add column if not exists signup_consent_version text;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.profiles'::regclass
    and confrelid='auth.users'::regclass and contype='f' and confdeltype='c') then
    alter table public.profiles add constraint profiles_auth_user_fk foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document text not null check (document in ('terms','privacy','data_collection','host_agreement')),
  version text not null,
  accepted_at timestamptz not null default now(),
  unique(user_id,document,version)
);
create table public.id_submissions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  id_type text not null check (id_type in ('government','student')),
  file_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text check (reject_reason in ('Blurry/unreadable','Name does not match account','Invalid or edited ID','Appears under 18','Other')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  -- An admin cannot review an upload reservation until Storage upload completes.
  uploaded_at timestamptz,
  cleanup_started_at timestamptz
);
create unique index id_submissions_one_pending on public.id_submissions(user_id) where status='pending';
create index id_submissions_review_queue on public.id_submissions(status,created_at);
do $$ declare t text; p record; begin
  foreach t in array array['profiles','consents','id_submissions'] loop
    execute format('alter table public.%I enable row level security',t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('create policy select_own on public.%I for select to authenticated using ((select auth.uid()) = %I)',t,case when t='profiles' then 'id' else 'user_id' end);
  end loop;
end $$;
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare dob date;
begin
  if coalesce(new.raw_user_meta_data->>'date_of_birth','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Valid DOB required'; end if;
  dob := (new.raw_user_meta_data->>'date_of_birth')::date;
  if dob > (current_date - interval '18 years')::date then raise exception 'You must be 18 or older'; end if;
  if new.raw_user_meta_data->>'accept_terms' is distinct from 'true'
    or new.raw_user_meta_data->>'consent_version' is distinct from '2026-01' then raise exception 'Consent required'; end if;
  insert into public.profiles(id,email,name,date_of_birth,signup_consent_version)
    values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'name',''),dob,'2026-01')
    on conflict(id) do update set name=excluded.name, date_of_birth=excluded.date_of_birth,
      signup_consent_version=excluded.signup_consent_version;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.accept_host_agreement(p_user_id uuid,p_version text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id=p_user_id for update;
  if not found or p.tier not in ('verified_guest','verified_host') or p.identity_status <> 'verified'
    or p.date_of_birth is null or p.date_of_birth > (current_date-interval '18 years')::date then raise exception 'Verification required'; end if;
  if p_version is distinct from '2026-01' then raise exception 'Current agreement required'; end if;
  insert into public.consents(user_id,document,version) values(p_user_id,'host_agreement',p_version) on conflict do nothing;
  update public.profiles set tier='verified_host' where id=p_user_id and tier='verified_guest';
end $$;
revoke all on function public.accept_host_agreement(uuid,text) from public,anon,authenticated;
grant execute on function public.accept_host_agreement(uuid,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('id-submissions','id-submissions',false,5242880,array['image/jpeg','image/png','image/webp'])
  on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- No browser allow policy. These restrictive guards also defeat pre-existing
-- permissive Storage policies for other buckets, without changing those policies.
create policy id_images_server_only on storage.objects as restrictive for all to anon,authenticated
  using (bucket_id <> 'id-submissions') with check (bucket_id <> 'id-submissions');
commit;
