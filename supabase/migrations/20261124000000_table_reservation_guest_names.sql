create table if not exists public.table_reservation_guests (
  reservation_item_id uuid primary key
    references public.reservation_item (reservation_item_id) on delete cascade,
  names text[] not null
);

alter table public.table_reservation_guests enable row level security;
