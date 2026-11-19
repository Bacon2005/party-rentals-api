\set ON_ERROR_STOP on
begin;
do $$ begin if current_database()<>'party_link_kyc_test' then raise exception 'Disposable database only'; end if; end $$;
create function public.assert_kyc(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'KYC test failed: %',label; end if; end $$;
insert into auth.users values
('c629f490-dca9-4fc9-a243-3c87be70479c','one@example.invalid','{"name":"One","date_of_birth":"1990-01-02","accept_terms":true,"consent_version":"2026-01"}'),
('d629f490-dca9-4fc9-a243-3c87be70479c','two@example.invalid','{"name":"Two","date_of_birth":"1991-01-02","accept_terms":true,"consent_version":"2026-01"}'),
('e629f490-dca9-4fc9-a243-3c87be70479c','admin@example.invalid','{"name":"Admin","date_of_birth":"1990-01-02","accept_terms":true,"consent_version":"2026-01"}');
update profiles set is_admin=true where name='Admin';
select public.assert_kyc((select tier='basic' and not is_admin and role='client' and date_of_birth='1990-01-02' from profiles where name='One'),'signup defaults');
do $$ begin
  begin
    insert into auth.users values(gen_random_uuid(),'minor@example.invalid',jsonb_build_object('date_of_birth',(current_date-interval '10 years')::date,'accept_terms',true,'consent_version','2026-01'));
    raise exception 'Minor accepted';
  exception when raise_exception then if sqlerrm<>'You must be 18 or older' then raise; end if; end;
  begin
    insert into auth.users values(gen_random_uuid(),'no-consent@example.invalid','{"date_of_birth":"1990-01-02"}');
    raise exception 'Missing consent accepted';
  exception when raise_exception then if sqlerrm<>'Consent required' then raise; end if; end;
end $$;
\echo 'PASS: trigger rejects minors and missing consent, preserves legacy fields/defaults'
set local role authenticated;
select set_config('request.jwt.claim.sub','c629f490-dca9-4fc9-a243-3c87be70479c',true);
select public.assert_kyc((select count(*)=1 from profiles),'own-profile only');
do $$ begin
  begin update profiles set tier='verified_host',is_admin=true,identity_status='verified'; raise exception 'Browser profile write allowed';
  exception when insufficient_privilege then null; end;
  begin insert into consents(user_id,document,version) values(auth.uid(),'terms','2026-01'); raise exception 'Browser consent insert allowed';
  exception when insufficient_privilege then null; end;
  begin perform reserve_id_submission(gen_random_uuid(),auth.uid(),'government','jpg'); raise exception 'Browser RPC allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into storage.objects(bucket_id,name) values('id-submissions','private-test-image');
set local role authenticated;
select public.assert_kyc((select count(*)=0 from storage.objects where bucket_id='id-submissions'),'cannot read private ID object');
do $$ begin
  begin insert into storage.objects(bucket_id,name) values('id-submissions','blocked'); raise exception 'Browser Storage upload allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'PASS: profile elevation, consent writes, service RPCs and private Storage access denied to browser'

grant all on event,reservation,reservation_item to anon,authenticated;
create policy legacy_event on event for all to public using(true) with check(true);
create policy legacy_reservation on reservation for all to public using(true) with check(true);
create policy legacy_item on reservation_item for all to public using(true) with check(true);
set local role anon;
do $$ begin
  begin insert into event(host_id) values('c629f490-dca9-4fc9-a243-3c87be70479c'); raise exception 'Anonymous host allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin insert into event(host_id) values(auth.uid()); raise exception 'Basic host allowed'; exception when insufficient_privilege then null; end;
  begin insert into reservation(attendee_id) values(auth.uid()); raise exception 'Basic RSVP allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'PASS: restrictive tier caps defeat legacy permissive policies'

set local role service_role;
select reserve_id_submission('10000000-0000-4000-8000-000000000001','c629f490-dca9-4fc9-a243-3c87be70479c','government','jpg');
do $$ begin
  begin perform reserve_id_submission(gen_random_uuid(),'c629f490-dca9-4fc9-a243-3c87be70479c','student','png'); raise exception 'Second pending allowed'; exception when unique_violation then null; end;
  begin perform review_id_submission('10000000-0000-4000-8000-000000000001','d629f490-dca9-4fc9-a243-3c87be70479c','approved'); raise exception 'Nonadmin review allowed';
  exception when raise_exception then if sqlerrm<>'Admin required' then raise; end if; end;
  begin perform review_id_submission('10000000-0000-4000-8000-000000000001','e629f490-dca9-4fc9-a243-3c87be70479c','approved'); raise exception 'Unfinished upload reviewed';
  exception when raise_exception then if sqlerrm<>'Upload is incomplete' then raise; end if; end;
end $$;
select public.assert_kyc(finish_id_submission('10000000-0000-4000-8000-000000000001','c629f490-dca9-4fc9-a243-3c87be70479c'),'finish upload');
select public.assert_kyc(review_id_submission('10000000-0000-4000-8000-000000000001','e629f490-dca9-4fc9-a243-3c87be70479c','rejected','Blurry/unreadable'),'reject pending');
select public.assert_kyc(not review_id_submission('10000000-0000-4000-8000-000000000001','e629f490-dca9-4fc9-a243-3c87be70479c','approved'),'double decision no-op');
select public.assert_kyc((select identity_status='failed' and tier='basic' from profiles where name='One'),'rejected remains basic');
select reserve_id_submission('10000000-0000-4000-8000-000000000002','c629f490-dca9-4fc9-a243-3c87be70479c','student','png');
select finish_id_submission('10000000-0000-4000-8000-000000000002','c629f490-dca9-4fc9-a243-3c87be70479c');
select review_id_submission('10000000-0000-4000-8000-000000000002','e629f490-dca9-4fc9-a243-3c87be70479c','approved');
select public.assert_kyc((select tier='verified_guest' and identity_status='verified' and verified_at is not null from profiles where name='One'),'approved promotes guest');
select public.assert_kyc((select reviewed_by is not null and reviewed_at is not null and reject_reason='Blurry/unreadable' from id_submissions where id='10000000-0000-4000-8000-000000000001'),'review audit');
-- Keep file_path until the Storage deletion succeeds, for a durable retry target.
select public.assert_kyc((select file_path is not null from id_submissions where id='10000000-0000-4000-8000-000000000002'),'deletion retry tracked');
select reserve_id_submission('20000000-0000-4000-8000-000000000001','d629f490-dca9-4fc9-a243-3c87be70479c','student','webp');
reset role;
set local role authenticated;
select public.assert_kyc((select count(*)=2 from id_submissions),'cannot read another user submission');
insert into reservation(attendee_id) values(auth.uid());
do $$ begin
  begin insert into event(host_id) values(auth.uid()); raise exception 'Guest host allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'PASS: one pending, no incomplete/nonadmin reviews, rejection/resubmission, idempotent approval and own-row RLS'

create function test_host_failure() returns trigger language plpgsql as $$ begin if new.tier='verified_host' then raise exception 'forced rollback'; end if; return new; end $$;
create trigger test_host_failure before update on profiles for each row execute function test_host_failure();
set local role service_role;
do $$ begin
  begin perform accept_host_agreement('c629f490-dca9-4fc9-a243-3c87be70479c','2026-01');
  exception when raise_exception then if sqlerrm<>'forced rollback' then raise; end if; end;
end $$;
select public.assert_kyc((select count(*)=0 from consents),'failed promotion rolls back consent');
reset role;
drop trigger test_host_failure on profiles;
set local role service_role;
select accept_host_agreement('c629f490-dca9-4fc9-a243-3c87be70479c','2026-01');
select accept_host_agreement('c629f490-dca9-4fc9-a243-3c87be70479c','2026-01');
select public.assert_kyc(not review_id_submission('10000000-0000-4000-8000-000000000002','e629f490-dca9-4fc9-a243-3c87be70479c','rejected','Other'),'review replay preserves host');
select public.assert_kyc((select tier='verified_host' from profiles where name='One'),'host preserved');
select public.assert_kyc((select count(*)=1 from consents where document='host_agreement'),'host consent idempotent');
reset role;
set local role authenticated;
insert into event(host_id) values(auth.uid());
reset role;
\echo 'PASS: atomic/idempotent host agreement, no host downgrade'

set local role service_role;
select public.assert_kyc(begin_id_upload_cleanup('20000000-0000-4000-8000-000000000001','d629f490-dca9-4fc9-a243-3c87be70479c',true),'claim cleanup');
select public.assert_kyc(not finish_id_submission('20000000-0000-4000-8000-000000000001','d629f490-dca9-4fc9-a243-3c87be70479c'),'late finalize cannot race cleanup');
select public.assert_kyc(cancel_id_upload('20000000-0000-4000-8000-000000000001','d629f490-dca9-4fc9-a243-3c87be70479c',true),'cancel reservation');
select reserve_id_submission('20000000-0000-4000-8000-000000000001','d629f490-dca9-4fc9-a243-3c87be70479c','student','webp');
reset role;
update id_submissions set created_at=now()-interval '31 days' where user_id='d629f490-dca9-4fc9-a243-3c87be70479c';
set local role service_role;
select public.assert_kyc(expire_id_submission('20000000-0000-4000-8000-000000000001'),'expired pending cleanup');
select public.assert_kyc((select identity_status='failed' from profiles where name='Two'),'expiry allows resubmission');
reset role;
delete from auth.users where id='d629f490-dca9-4fc9-a243-3c87be70479c';
select public.assert_kyc((select count(*)=0 from id_submissions where user_id='d629f490-dca9-4fc9-a243-3c87be70479c'),'auth cascade');
\echo 'PASS: 30-day expiry and auth cascades'
rollback;
