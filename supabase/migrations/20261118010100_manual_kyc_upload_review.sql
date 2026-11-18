begin;
-- All mutations are service-role-only and independently enforce their invariants.
create function public.reserve_id_submission(p_id uuid,p_user_id uuid,p_id_type text,p_ext text) returns void
language plpgsql security definer set search_path=public as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id=p_user_id for update;
  if not found or p.tier <> 'basic' or p.identity_status='verified' then raise exception 'Already verified or missing profile'; end if;
  if p.date_of_birth is null or p.date_of_birth > (current_date-interval '18 years')::date then raise exception 'Adult DOB required'; end if;
  if p_ext not in ('jpg','png','webp') then raise exception 'Invalid image type'; end if;
  insert into public.id_submissions(id,user_id,id_type,file_path)
    values(p_id,p_user_id,p_id_type,p_user_id::text||'/'||p_id::text||'.'||p_ext);
  update public.profiles set identity_status='pending' where id=p_user_id;
end $$;
create function public.finish_id_submission(p_id uuid,p_user_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  update public.id_submissions set uploaded_at=coalesce(uploaded_at,now())
    where id=p_id and user_id=p_user_id and status='pending' and file_path is not null;
  return found;
end $$;
create function public.cancel_id_upload(p_id uuid,p_user_id uuid,p_immediate boolean default false) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  perform 1 from public.profiles where id=p_user_id for update;
  delete from public.id_submissions where id=p_id and user_id=p_user_id and status='pending' and uploaded_at is null
    and (p_immediate or created_at < now()-interval '10 minutes');
  if not found then return false; end if;
  update public.profiles set identity_status=case when exists(select 1 from public.id_submissions where user_id=p_user_id and status='rejected') then 'failed' else 'none' end
    where id=p_user_id and tier='basic';
  return true;
end $$;
create function public.review_id_submission(p_id uuid,p_admin_id uuid,p_decision text,p_reason text default null) returns boolean
language plpgsql security definer set search_path=public as $$
declare s public.id_submissions%rowtype; owner_id uuid; dob date;
begin
  if not exists(select 1 from public.profiles where id=p_admin_id and is_admin) then raise exception 'Admin required'; end if;
  if p_decision not in ('approved','rejected') or p_decision is null then raise exception 'Invalid decision'; end if;
  if p_decision='rejected' and (p_reason is null or p_reason not in ('Blurry/unreadable','Name does not match account','Invalid or edited ID','Appears under 18','Other')) then raise exception 'Choose a rejection reason'; end if;
  select user_id into owner_id from public.id_submissions where id=p_id;
  select date_of_birth into dob from public.profiles where id=owner_id for update;
  select * into s from public.id_submissions where id=p_id for update;
  if not found or s.status <> 'pending' then return false; end if;
  if s.uploaded_at is null then raise exception 'Upload is incomplete'; end if;
  if p_decision='approved' and (dob is null or dob > (current_date-interval '18 years')::date) then raise exception 'Adult DOB required'; end if;
  update public.id_submissions set status=p_decision,reject_reason=case when p_decision='rejected' then p_reason else null end,
    reviewed_by=p_admin_id,reviewed_at=now() where id=p_id and status='pending';
  if p_decision='approved' then
    update public.profiles set tier=case when tier='basic' then 'verified_guest'::public.verification_tier else tier end,
      identity_status='verified',verified_at=coalesce(verified_at,now()) where id=s.user_id;
  else
    update public.profiles set identity_status='failed' where id=s.user_id and tier='basic';
  end if;
  return true;
end $$;
revoke all on function public.reserve_id_submission(uuid,uuid,text,text),public.finish_id_submission(uuid,uuid),public.cancel_id_upload(uuid,uuid,boolean),public.review_id_submission(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_id_submission(uuid,uuid,text,text),public.finish_id_submission(uuid,uuid),public.cancel_id_upload(uuid,uuid,boolean),public.review_id_submission(uuid,uuid,text,text) to service_role;
commit;
