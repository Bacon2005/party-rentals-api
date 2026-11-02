"use server";
import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  reservation,
  reservationItem,
} from "@/db/schema";
import { verifyUser } from "@/lib/auth";
import { sendPushToProfile } from "@/lib/push";

export async function decideReservation(
  reservationId: string,
  decision: "Confirmed" | "Denied",
) {
  const profile = await verifyUser();

  // 1. Is this reservation for one of this host's events?
  const owned = await db
    .select({ id: reservation.reservationId })
    .from(reservation)
    .innerJoin(
      reservationItem,
      eq(reservationItem.reservationId, reservation.reservationId),
    )
    .leftJoin(eventTable, eq(eventTable.tableId, reservationItem.tableId))
    .leftJoin(eventTicket, eq(eventTicket.ticketId, reservationItem.ticketId))
    .innerJoin(
      event,
      or(
        eq(event.eventId, eventTable.eventId),
        eq(event.eventId, eventTicket.eventId),
      ),
    )
    .where(
      and(
        eq(reservation.reservationId, reservationId),
        eq(event.hostId, profile.id),
      ),
    )
    .limit(1);

  if (owned.length === 0) {
    return { ok: false, error: "Reservation not found." };
  }

  // 2. Update only if it's still Pending (blocks double clicks and re-sends)
  const [updated] = await db
    .update(reservation)
    .set({ status: decision })
    .where(
      and(
        eq(reservation.reservationId, reservationId),
        eq(reservation.status, "Pending"),
      ),
    )
    .returning({ attendeeId: reservation.attendeeId });

  if (!updated) {
    return { ok: false, error: "This reservation was already decided." };
  }

  // 3. Notify the guest
  await sendPushToProfile(
    updated.attendeeId,
    "Reservation update",
    decision === "Confirmed"
      ? "Your reservation has been confirmed."
      : "Your reservation was not approved.",
  );
  revalidatePath("/bookings");
  return { ok: true };
}
