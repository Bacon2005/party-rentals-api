\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() <> 'party_link_kyc_test' then raise exception 'Use a disposable test database'; end if;
end $$;
create function public.assert_kyc(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'KYC test failed: %', label; end if; end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
('c629f490-dca9-4fc9-a243-3c87be70479c', 'one@example.invalid', '{"name":"One","date_of_birth":"1990-01-02","accept_terms":true,"consent_version":"2026-01"}'),
('d629f490-dca9-4fc9-a243-3c87be70479c', 'two@example.invalid', '{"name":"Two","date_of_birth":"1991-01-02","accept_terms":true,"consent_version":"2026-01"}');
select public.assert_kyc((select tier = 'basic' and identity_status = 'none' and date_of_birth = '1990-01-02' and email = 'one@example.invalid' and role = 'client' from profiles where name = 'One'), 'trigger metadata/defaults');
select public.assert_kyc((select count(*) = 0 from consents), 'no consent before email verification');
do $$ begin
  begin
    insert into auth.users values (gen_random_uuid(), 'minor@example.invalid', jsonb_build_object('name', 'Minor', 'date_of_birth', (current_date - interval '10 years')::date, 'accept_terms', true, 'consent_version', '2026-01'));
    raise exception 'minor was accepted';
  exception when raise_exception then
    if sqlerrm <> 'You must be 18 or older' then raise; end if;
  end;
end $$;
\echo 'PASS: signup trigger rejects minors and preserves existing profile fields'

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c629f490-dca9-4fc9-a243-3c87be70479c', true);
select public.assert_kyc((select count(*) = 1 from profiles), 'profile select-own RLS');
do $$ begin
  begin update profiles set tier = 'verified_host'; raise exception 'browser tier update succeeded';
  exception when insufficient_privilege then null; end;
  begin insert into profiles (id, name) values (gen_random_uuid(), 'Fake'); raise exception 'browser profile insert succeeded';
  exception when insufficient_privilege then null; end;
  begin insert into consents (user_id, document, version) values (auth.uid(), 'host_agreement', '2026-01'); raise exception 'browser consent insert succeeded';
  exception when insufficient_privilege then null; end;
  begin perform public.accept_host_agreement(auth.uid(), '2026-01'); raise exception 'browser RPC succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'PASS: browser cannot insert profiles/consents, update tier, or execute host RPC'

-- Simulate permissive legacy policies. The restrictive tier caps must still win.
grant all on event, reservation, reservation_item to anon, authenticated;
create policy test_legacy_event on event for all to public using (true) with check (true);
create policy test_legacy_reservation on reservation for all to public using (true) with check (true);
create policy test_legacy_items on reservation_item for all to public using (true) with check (true);
set local role anon;
do $$ begin
  begin insert into event (host_id) values ('c629f490-dca9-4fc9-a243-3c87be70479c'); raise exception 'anonymous event insert succeeded';
  exception when insufficient_privilege then null; end;
  begin insert into reservation (attendee_id) values ('c629f490-dca9-4fc9-a243-3c87be70479c'); raise exception 'anonymous RSVP succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin insert into event (host_id) values (auth.uid()); raise exception 'basic event insert succeeded';
  exception when insufficient_privilege then null; end;
  begin insert into reservation (attendee_id) values (auth.uid()); raise exception 'basic RSVP succeeded';
  exception when insufficient_privilege then null; end;
  begin insert into reservation_item default values; raise exception 'basic reservation item succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'PASS: restrictive policies block anonymous/basic users even with permissive legacy public policies'

set local role service_role;
do $$ begin
  begin perform public.accept_host_agreement('c629f490-dca9-4fc9-a243-3c87be70479c', '2026-01'); raise exception 'basic host promotion succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Identity and age verification is required' then raise; end if;
  end;
end $$;
update profiles set tier = 'verified_guest', identity_status = 'verified', identity_ref = 'vs_test', verified_at = now()
where id = 'c629f490-dca9-4fc9-a243-3c87be70479c';
reset role;
set local role authenticated;
insert into reservation (attendee_id) values (auth.uid());
do $$ begin
  begin insert into event (host_id) values (auth.uid()); raise exception 'guest event creation succeeded';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo 'PASS: verified guest can RSVP but cannot create an event'

-- Force promotion to fail after its consent INSERT, proving atomic rollback.
create function public.test_host_failure() returns trigger language plpgsql as $$
begin if new.tier = 'verified_host' then raise exception 'forced test failure'; end if; return new; end;
$$;
create trigger test_host_failure before update on profiles for each row execute function public.test_host_failure();
set local role service_role;
do $$ begin
  begin perform public.accept_host_agreement('c629f490-dca9-4fc9-a243-3c87be70479c', '2026-01');
  exception when raise_exception then
    if sqlerrm <> 'forced test failure' then raise; end if;
  end;
end $$;
reset role;
select public.assert_kyc((select count(*) = 0 from consents), 'agreement rolled back with failed promotion');
select public.assert_kyc((select tier = 'verified_guest' from profiles where name = 'One'), 'tier unchanged on failed promotion');
drop trigger test_host_failure on profiles;
set local role service_role;
select public.accept_host_agreement('c629f490-dca9-4fc9-a243-3c87be70479c', '2026-01');
select public.accept_host_agreement('c629f490-dca9-4fc9-a243-3c87be70479c', '2026-01');
reset role;
select public.assert_kyc((select count(*) = 1 from consents where document = 'host_agreement'), 'host agreement idempotency');
select public.assert_kyc((select tier = 'verified_host' from profiles where name = 'One'), 'host promoted');
insert into consents (user_id, document, version) values ('d629f490-dca9-4fc9-a243-3c87be70479c', 'terms', '2026-01');
set local role authenticated;
select public.assert_kyc((select count(*) = 1 from consents), 'consent select-own RLS');
insert into event (host_id) values (auth.uid());
reset role;
\echo 'PASS: atomic/idempotent host promotion logs consent, enables event creation, and preserves consent RLS'

delete from auth.users where id = 'd629f490-dca9-4fc9-a243-3c87be70479c';
select public.assert_kyc((select count(*) = 0 from profiles where name = 'Two'), 'profile deletion cascades');
select public.assert_kyc((select count(*) = 0 from consents where user_id = 'd629f490-dca9-4fc9-a243-3c87be70479c'), 'consent deletion cascades');
\echo 'PASS: auth deletion cascades to profile and consents'
rollback;
