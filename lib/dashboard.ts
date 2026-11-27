import "server-only";
import {
  and,
  count,
  countDistinct,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  reservation,
  reservationItem,
  tableReservationGuests,
} from "@/db/schema";
import type { AnalyticsRange, BookingsGuestsDataPoint } from "@/types/analytics";

const manilaMonth = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "numeric",
});
const monthLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
});

const addedGuests = sql`coalesce(sum(cardinality(${tableReservationGuests.names})), 0)`;
const guestTotal = sql<number>`${count()} + ${addedGuests}`.mapWith(Number);

function getManilaMonths(now: Date, range: number) {
  const monthParts = manilaMonth.formatToParts(now);
  const year = Number(monthParts.find((part) => part.type === "year")?.value);
  const month = Number(monthParts.find((part) => part.type === "month")?.value);
  return Array.from({ length: range }, (_, index) =>
    new Date(Date.UTC(year, month - range + index)),
  );
}

const monthKey = (date: Date) => date.toISOString().slice(0, 7);
const manilaMonthStart = (month: Date) =>
  new Date(`${monthKey(month)}-01T00:00:00+08:00`);
const manilaMonthBucket = (timestamp: SQLWrapper) =>
  sql<string>`to_char(timezone('Asia/Manila', ${timestamp}), 'YYYY-MM')`;

export async function getTotalEvents(hostId: string) {
  const [result] = await db
    .select({ total: count() })
    .from(event)
    .where(eq(event.hostId, hostId));

  return result.total;
}

// Each reservation item stores the actual booked price. Do not join payment
// proofs here: multiple proofs for one item must not count as multiple sales.
function confirmedBookingItems(hostId: string) {
  return db
    .select({
      eventId: event.eventId,
      reservationId: reservation.reservationId,
      attendeeId: reservation.attendeeId,
      reservationItemId: reservationItem.reservationItemId,
      reservedAt: reservation.reservedAt,
      unitPrice: reservationItem.unitPrice,
    })
    .from(reservationItem)
    .innerJoin(
      reservation,
      eq(reservation.reservationId, reservationItem.reservationId),
    )
    .leftJoin(eventTicket, eq(eventTicket.ticketId, reservationItem.ticketId))
    .leftJoin(eventTable, eq(eventTable.tableId, reservationItem.tableId))
    .innerJoin(
      event,
      eq(
        event.eventId,
        sql`coalesce(${eventTicket.eventId}, ${eventTable.eventId})`,
      ),
    )
    .where(and(eq(event.hostId, hostId), eq(reservation.status, "Confirmed")))
    .as("confirmed_booking_items");
}

export async function getTotalRevenue(hostId: string) {
  const items = confirmedBookingItems(hostId);
  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${items.unitPrice}), 0)`.mapWith(Number),
    })
    .from(items);

  return result.total;
}

export async function getEventBookingTotals(hostId: string, eventIds: string[]) {
  if (eventIds.length === 0) return [];
  const items = confirmedBookingItems(hostId);
  return db
    .select({
      eventId: items.eventId,
      revenue: sql<number>`coalesce(sum(${items.unitPrice}), 0)`.mapWith(Number),
      guests: guestTotal,
    })
    .from(items)
    .leftJoin(
      tableReservationGuests,
      eq(tableReservationGuests.reservationItemId, items.reservationItemId),
    )
    .where(inArray(items.eventId, eventIds))
    .groupBy(items.eventId);
}

export async function getMonthlyBookingTotals(
  hostId: string,
  range: AnalyticsRange,
  now = new Date(),
): Promise<BookingsGuestsDataPoint[]> {
  const months = getManilaMonths(now, range);
  const start = manilaMonthStart(months[0]);
  const items = confirmedBookingItems(hostId);
  const month = manilaMonthBucket(items.reservedAt);
  const rows = await db
    .select({
      month,
      bookings: countDistinct(items.reservationId),
      guests: guestTotal,
    })
    .from(items)
    .leftJoin(
      tableReservationGuests,
      eq(tableReservationGuests.reservationItemId, items.reservationItemId),
    )
    .where(and(gte(items.reservedAt, start), lte(items.reservedAt, now)))
    .groupBy(month);

  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((date) => {
    const row = byMonth.get(monthKey(date));
    return {
      month: monthLabel.format(date),
      bookings: row?.bookings ?? 0,
      guests: row?.guests ?? 0,
    };
  });
}

function changeFromPreviousMonth(current: number, previous: number) {
  if (current === previous) return 0;
  return previous === 0 ? null : (current - previous) / previous;
}

export async function getMonthlySummaryChanges(hostId: string, now = new Date()) {
  const [previousMonth, currentMonth] = getManilaMonths(now, 2);
  const start = manilaMonthStart(previousMonth);
  const previousKey = monthKey(previousMonth);
  const currentKey = monthKey(currentMonth);
  const eventMonth = manilaMonthBucket(event.createdAt);
  const items = confirmedBookingItems(hostId);
  const bookingMonth = manilaMonthBucket(items.reservedAt);

  const [events, stats] = await Promise.all([
    db
      .select({ month: eventMonth, events: count() })
      .from(event)
      .where(
        and(eq(event.hostId, hostId), gte(event.createdAt, start), lte(event.createdAt, now)),
      )
      .groupBy(eventMonth),
    db
      .select({
        month: bookingMonth,
        bookings: countDistinct(items.reservationId),
        guests: sql<number>`${countDistinct(items.attendeeId)} + ${addedGuests}`.mapWith(Number),
        revenue: sql<number>`sum(${items.unitPrice})`.mapWith(Number),
      })
      .from(items)
      .leftJoin(
        tableReservationGuests,
        eq(tableReservationGuests.reservationItemId, items.reservationItemId),
      )
      .where(and(gte(items.reservedAt, start), lte(items.reservedAt, now)))
      .groupBy(bookingMonth),
  ]);

  const currentEvents = events.find((row) => row.month === currentKey)?.events ?? 0;
  const previousEvents = events.find((row) => row.month === previousKey)?.events ?? 0;
  const current = stats.find((row) => row.month === currentKey);
  const previous = stats.find((row) => row.month === previousKey);

  return {
    events: changeFromPreviousMonth(currentEvents, previousEvents),
    bookings: changeFromPreviousMonth(current?.bookings ?? 0, previous?.bookings ?? 0),
    guests: changeFromPreviousMonth(current?.guests ?? 0, previous?.guests ?? 0),
    revenue: changeFromPreviousMonth(current?.revenue ?? 0, previous?.revenue ?? 0),
  };
}
