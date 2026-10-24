// lib/events.ts
import { and, countDistinct, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  reservation,
  reservationItem,
} from "@/db/schema";

export async function getBookingStats(hostId: string) {
  const [result] = await db
    .select({
      bookings: countDistinct(reservation.reservationId),
      guests: countDistinct(reservation.attendeeId),
    })
    .from(reservation)
    .innerJoin(
      reservationItem,
      eq(reservationItem.reservationId, reservation.reservationId),
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
    .where(and(eq(event.hostId, hostId), eq(reservation.status, "Confirmed")));

  return result;
}
