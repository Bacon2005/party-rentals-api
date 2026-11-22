// app/(app)/analytics/data.ts
import { db } from "@/db";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  event,
  eventTable,
  eventTicket,
  reservation,
  reservationItem,
} from "@/db/schema";

const TZ = "Asia/Manila";

// Must match the literal inside itemsSubquery below.
export const TABLE_LABEL = "Table Reservations";

export const GROUPS = ["day", "week", "month"] as const;
export type Group = (typeof GROUPS)[number];

export type AnalyticsFilters = {
  eventId?: string;
  type?: string;
  from: string; // YYYY-MM-DD, Manila time
  to: string;
  group: Group;
};

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// ---------- URL params -> validated filters ----------
type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isYmd = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function parseFilters(raw: Raw): AnalyticsFilters {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  let from = one(raw.from);
  let to = one(raw.to);
  if (!isYmd(to)) to = today;
  if (!isYmd(from)) from = addDays(to, -29); // default: last 30 days
  if (from > to) [from, to] = [to, from];
  return {
    eventId: one(raw.event) || undefined,
    type: one(raw.type) || undefined,
    from,
    to,
    group: GROUPS.find((g) => g === one(raw.group)) ?? "day",
  };
}

// ---------- shared piece: one row per confirmed reservation item ----------
function itemsSubquery(
  hostId: string,
  f: AnalyticsFilters,
  start: Date,
  end: Date,
) {
  return db
    .select({
      reservationId: reservation.reservationId,
      itemId: reservationItem.reservationItemId,
      unitPrice: reservationItem.unitPrice,
      reservedAt: reservation.reservedAt,
      // A ticket item shows its ticket name; a table item has no ticket,
      // so it falls back to the label.
      type: sql<string>`COALESCE(${eventTicket.name}, 'Table Reservations')`.as(
        "type",
      ),
    })
    .from(reservation)
    .innerJoin(
      reservationItem,
      eq(reservation.reservationId, reservationItem.reservationId),
    )
    .leftJoin(eventTicket, eq(reservationItem.ticketId, eventTicket.ticketId))
    .leftJoin(eventTable, eq(reservationItem.tableId, eventTable.tableId))
    .innerJoin(
      event,
      sql`${event.eventId} = COALESCE(${eventTicket.eventId}, ${eventTable.eventId})`,
    )
    .where(
      and(
        eq(event.hostId, hostId),
        eq(reservation.status, "Confirmed"),
        gte(reservation.reservedAt, start),
        lt(reservation.reservedAt, end),
        f.eventId ? eq(event.eventId, f.eventId) : undefined,
      ),
    )
    .as("items");
}

// ---------- the three queries ----------
async function totals(
  hostId: string,
  f: AnalyticsFilters,
  start: Date,
  end: Date,
) {
  const items = itemsSubquery(hostId, f, start, end);
  const [row] = await db
    .select({
      bookings:
        sql<number>`COUNT(DISTINCT ${items.reservationId})`.mapWith(Number),
      guests: sql<number>`COUNT(${items.itemId})`.mapWith(Number),
      revenue:
        sql<number>`COALESCE(SUM(${items.unitPrice}), 0)`.mapWith(Number),
    })
    .from(items)
    .where(f.type ? eq(items.type, f.type) : undefined);
  return row;
}

async function revenueSeries(
  hostId: string,
  f: AnalyticsFilters,
  start: Date,
  end: Date,
) {
  const items = itemsSubquery(hostId, f, start, end);
  // f.group is whitelisted in parseFilters, so it's safe to inline here.
  // (A bound parameter inside GROUP BY makes Postgres reject the query.)
  const unit = sql.raw(`'${f.group}'`);
  const bucket = sql<string>`to_char(date_trunc(${unit}, ${items.reservedAt} AT TIME ZONE 'Asia/Manila'), 'YYYY-MM-DD')`;

  const rows = await db
    .select({
      bucket,
      revenue:
        sql<number>`COALESCE(SUM(${items.unitPrice}), 0)`.mapWith(Number),
    })
    .from(items)
    .where(f.type ? eq(items.type, f.type) : undefined)
    .groupBy(bucket)
    .orderBy(bucket);

  const label = (ymd: string) =>
    new Date(`${ymd}T00:00:00+08:00`).toLocaleDateString("en-US", {
      timeZone: TZ,
      month: "short",
      ...(f.group === "month" ? { year: "numeric" } : { day: "numeric" }),
    });

  // The database only returns days that had sales. Fill the gaps with 0
  // so the daily chart has a bar slot for every day.
  if (f.group === "day") {
    const byDay = new Map(rows.map((r) => [r.bucket, r.revenue]));
    const out: { label: string; revenue: number }[] = [];
    for (let d = f.from; d <= f.to; d = addDays(d, 1)) {
      out.push({ label: label(d), revenue: byDay.get(d) ?? 0 });
    }
    return out;
  }
  return rows.map((r) => ({ label: label(r.bucket), revenue: r.revenue }));
}

async function bookingsByType(
  hostId: string,
  f: AnalyticsFilters,
  start: Date,
  end: Date,
) {
  const items = itemsSubquery(hostId, f, start, end);
  const count = sql<number>`COUNT(${items.itemId})`.mapWith(Number);
  // The type filter is skipped here so the donut still shows the full
  // breakdown. Add .where(f.type ? eq(items.type, f.type) : undefined)
  // if you want it to follow the type filter.
  return db
    .select({ type: items.type, count })
    .from(items)
    .groupBy(items.type)
    .orderBy(desc(count));
}

const pct = (cur: number, prev: number) =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);

export async function getAnalytics(hostId: string, f: AnalyticsFilters) {
  const start = new Date(`${f.from}T00:00:00+08:00`);
  const end = new Date(`${addDays(f.to, 1)}T00:00:00+08:00`);
  // previous period = same length, ending where this one starts
  const prevStart = new Date(
    start.getTime() - (end.getTime() - start.getTime()),
  );

  const [current, previous, series, byType] = await Promise.all([
    totals(hostId, f, start, end),
    totals(hostId, f, prevStart, start),
    revenueSeries(hostId, f, start, end),
    bookingsByType(hostId, f, start, end),
  ]);

  return {
    stats: {
      ...current,
      change: {
        bookings: pct(current.bookings, previous.bookings),
        guests: pct(current.guests, previous.guests),
        revenue: pct(current.revenue, previous.revenue),
      },
    },
    series,
    byType,
  };
}

// ---------- options for the dropdowns ----------
export async function getFilterOptions(hostId: string) {
  const [events, tickets] = await Promise.all([
    db
      .select({ id: event.eventId, name: event.eventName })
      .from(event)
      .where(eq(event.hostId, hostId))
      .orderBy(event.eventName),
    db
      .selectDistinct({ name: eventTicket.name })
      .from(eventTicket)
      .innerJoin(event, eq(eventTicket.eventId, event.eventId))
      .where(eq(event.hostId, hostId)),
  ]);
  return { events, types: [...tickets.map((t) => t.name), TABLE_LABEL] };
}