-- Custom SQL migration file, put your code below! --
create or replace function public.get_recent_events(p_limit int default 5)
returns table (
  event_id uuid,
  event_name text,
  location text,
  image_url text,
  start_time timestamptz,
  end_time timestamptz,
  total_earned double precision,
  bookings bigint,
  guests bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with counted as (
    select
      coalesce(tk.event_id, t.event_id) as event_id,
      r.reservation_id,
      case when ri.item_type = 'ticket' then 1
           else coalesce(t.capacity, 0) end as guests
    from reservation_item ri
    join reservation r
      on r.reservation_id = ri.reservation_id
     and r.status = 'Confirmed'
    left join event_ticket tk on tk.ticket_id = ri.ticket_id
    left join event_table  t  on t.table_id  = ri.table_id
  ),
  agg as (
    select event_id,
           count(distinct reservation_id) as bookings,
           sum(guests) as guests
    from counted
    group by event_id
  )
  select
    e.event_id,
    e.event_name::text,
    e.location::text,
    e.map::text,
    e.start_time,
    e.end_time,
    e.total_earned,
    coalesce(a.bookings, 0),
    coalesce(a.guests, 0)
  from event e
  left join agg a on a.event_id = e.event_id
  where e.host_id = auth.uid()
    and e.status = 'published'
  order by e.created_at desc
  limit p_limit;
$$;
--> statement-breakpoint
revoke execute on function public.get_recent_events(int) from public, anon;
--> statement-breakpoint
grant execute on function public.get_recent_events(int) to authenticated;