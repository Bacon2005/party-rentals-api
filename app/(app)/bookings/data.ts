import { eq, sql } from "drizzle-orm";
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
