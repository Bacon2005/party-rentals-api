import "server-only";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  reservation,
  reservationItem,
} from "@/db/schema";

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
    .select({ eventId: event.eventId, unitPrice: reservationItem.unitPrice })
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

export async function getEventRevenues(hostId: string, eventIds: string[]) {
  if (eventIds.length === 0) return [];
  const items = confirmedBookingItems(hostId);
  return db
    .select({
      eventId: items.eventId,
      total: sql<number>`coalesce(sum(${items.unitPrice}), 0)`.mapWith(Number),
    })
    .from(items)
    .where(inArray(items.eventId, eventIds))
    .groupBy(items.eventId);
}
