begin;

-- Service-role-only RPC keeps the agreement and tier promotion atomic.
create function public.accept_host_agreement(p_user_id uuid, p_version text)
returns void
language plpgsql security definer set search_path = public
as $$
declare profile public.profiles%rowtype;
begin
  select * into profile from public.profiles where id = p_user_id for update;
  if not found or profile.tier not in ('verified_guest', 'verified_host')
    or profile.identity_status <> 'verified'
    or profile.date_of_birth is null
    or profile.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'Identity and age verification is required';
  end if;
  if p_version is distinct from '2026-01' then
    raise exception 'Accept the current host agreement';
  end if;
  insert into public.consents (user_id, document, version)
  values (p_user_id, 'host_agreement', p_version)
  on conflict (user_id, document, version) do nothing;
  update public.profiles set tier = 'verified_host' where id = p_user_id and tier = 'verified_guest';
end;
$$;
revoke all on function public.accept_host_agreement(uuid, text) from public, anon, authenticated;
grant execute on function public.accept_host_agreement(uuid, text) to service_role;

commit;
