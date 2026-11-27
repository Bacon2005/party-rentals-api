// lib/events.ts
import { and, countDistinct, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  reservation,
  reservationItem,
  tableReservationGuests,
} from "@/db/schema";
import { toEventDto } from "./event-dto";

export async function getBookingStats(hostId: string) {
  const [result] = await db
    .select({
      bookings: countDistinct(reservation.reservationId),
      guests: sql<number>`
        ${countDistinct(reservation.attendeeId)}
        + coalesce(sum(cardinality(${tableReservationGuests.names})), 0)
      `.mapWith(Number),
    })
    .from(reservation)
    .innerJoin(
      reservationItem,
      eq(reservationItem.reservationId, reservation.reservationId),
    )
    .leftJoin(eventTicket, eq(eventTicket.ticketId, reservationItem.ticketId))
    .leftJoin(eventTable, eq(eventTable.tableId, reservationItem.tableId))
    .leftJoin(
      tableReservationGuests,
      eq(tableReservationGuests.reservationItemId, reservationItem.reservationItemId),
    )
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

export async function getHostEvents(hostId: string) {
  const rows = await db.select().from(event).where(eq(event.hostId, hostId));
  return rows.map(toEventDto);
}
