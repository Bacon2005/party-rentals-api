import { and, eq, gt, ne, not, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  reservation,
  reservationItem,
  paymentProof,
  eventTicket,
  eventTable,
  event,
  profiles,
  tableReservationGuests,
} from "@/db/schema";
import { tableHoldExpired } from "@/lib/table-holds";

// Lists bookings for this host's upcoming events with guest and payment details.
export async function getReservations(hostId: string) {
  const result = await db
    .select({
      reservationId: reservation.reservationId,
      guestName: profiles.name,
      email: profiles.email,
      status: reservation.status,
      bookingDate: reservation.reservedAt,

      eventName: event.eventName,
      tableCapacity: eventTable.capacity,
      tableGuestCount: sql<number>`
        coalesce(cardinality(${tableReservationGuests.names}), 0)
      `.mapWith(Number),

      bookingType: sql<string>`
        COALESCE(
          ${eventTicket.name},
          ${eventTable.label}
        )
      `,

      amount: reservationItem.unitPrice,
      paymentReference: paymentProof.referenceNum,
      screenshotUrl: paymentProof.screenshotUrl,
      profileUrl: profiles.avatarUrl,
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
    .leftJoin(
      tableReservationGuests,
      eq(tableReservationGuests.reservationItemId, reservationItem.reservationItemId),
    )
    // The query uses COALESCE to get the booking type from the ticket name or table label,
    // and to find the associated event from the ticket or table.
    .innerJoin(
      event,
      sql`COALESCE(
        ${eventTicket.eventId},
        ${eventTable.eventId}
      ) = ${event.eventId}`,
    )
    .where(and(
      eq(event.hostId, hostId),
      gt(event.startTime, new Date()),
      ne(reservation.status, "Cancelled"),
      not(tableHoldExpired),
    ));

  return result;
}
