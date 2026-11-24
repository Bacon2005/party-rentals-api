alter table public.reservation
  drop constraint if exists reservation_status_check,
  add constraint reservation_status_check
    check (status in ('Pending', 'Confirmed', 'Denied', 'Cancelled'));
