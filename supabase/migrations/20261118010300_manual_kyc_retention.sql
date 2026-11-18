begin;
create function public.expire_id_submission(p_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare owner_id uuid;
begin
  select user_id into owner_id from public.id_submissions where id=p_id;
  perform 1 from public.profiles where id=owner_id for update;
  update public.id_submissions set status='rejected',reject_reason='Other',reviewed_at=now()
    where id=p_id and status='pending' and created_at < now()-interval '30 days';
  if not found then return false; end if;
  update public.profiles set identity_status='failed' where id=owner_id and tier='basic';
  return true;
end $$;
revoke all on function public.expire_id_submission(uuid) from public,anon,authenticated;
grant execute on function public.expire_id_submission(uuid) to service_role;
commit;
