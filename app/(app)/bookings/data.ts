import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  reservation,
  reservationItem,
  paymentProof,
  eventTicket,
  eventTable,
  event,
  profiles,
} from "@/db/schema";

// Drizzle query joins reservations to guest profiles, reservation items, events,
// and—when present—payment proofs, tickets, or tables. It filters by event.hostId,
// so it returns bookings for that host’s events, not every booking in the database.
export async function getReservations(hostId: string) {
  const result = await db
    .select({
      reservationId: reservation.reservationId,
      guestName: profiles.name,
      email: profiles.email,
      status: reservation.status,
      bookingDate: reservation.reservedAt,

      eventName: event.eventName,

      bookingType: sql<string>`
        COALESCE(
          ${eventTicket.name},
          ${eventTable.label}
        )
      `,

      amount: reservationItem.unitPrice,
      paymentReference: paymentProof.referenceNum,
      screenshotUrl: paymentProof.screenshotUrl,
      paymentStatus: paymentProof.status,
      paidAt: paymentProof.paidAt,
    })
    .from(reservation)
    .innerJoin(profiles, eq(reservation.attendeeId, profiles.id))
    .innerJoin(
      reservationItem,
      eq(reservation.reservationId, reservationItem.reservationId),
    )
    .leftJoin(
      paymentProof,
      eq(reservationItem.reservationItemId, paymentProof.reservationItemId),
    )
    .leftJoin(eventTicket, eq(reservationItem.ticketId, eventTicket.ticketId))
    .leftJoin(eventTable, eq(reservationItem.tableId, eventTable.tableId))
    // The query uses COALESCE to get the booking type from the ticket name or table label,
    // and to find the associated event from the ticket or table.
    .innerJoin(
      event,
      sql`COALESCE(
        ${eventTicket.eventId},
        ${eventTable.eventId}
      ) = ${event.eventId}`,
    )
    .where(eq(event.hostId, hostId));

  return result;
}
