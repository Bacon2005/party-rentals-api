"use server";
import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  paymentProof,
  reservation,
  reservationItem,
} from "@/db/schema";
import { verifyUser } from "@/lib/auth";
import { sendPushToProfile } from "@/lib/push";
import { tableHoldExpired } from "@/lib/table-holds";

export async function decideReservation(
  reservationId: string,
  decision: "Confirmed" | "Denied",
) {
  const profile = await verifyUser();

  // 1. Is this reservation for one of this host's events?
  const owned = await db
    .select({
      id: reservation.reservationId,
      itemType: reservationItem.itemType,
      itemId: reservationItem.reservationItemId,
      unitPrice: reservationItem.unitPrice,
    })
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

  const [item] = owned;
  if (!item) {
    return { ok: false, error: "Reservation not found." };
  }

  // 2. Update only if it's still Pending (blocks double clicks and re-sends)
  const updatePending = (writer: Pick<typeof db, "update">) =>
    writer
      .update(reservation)
      .set({ status: decision })
      .where(
        and(
          eq(reservation.reservationId, reservationId),
          eq(reservation.status, "Pending"),
        ),
      )
      .returning({ attendeeId: reservation.attendeeId });

  const result = item.itemType === "table"
    ? await db.transaction(async (tx) => {
        const [booking] = await tx
          .select({ status: reservation.status })
          .from(reservation)
          .where(eq(reservation.reservationId, reservationId))
          .for("update");

        if (booking?.status !== "Pending") return { updated: undefined };

        const [hold] = await tx
          .select({ expired: tableHoldExpired })
          .from(reservationItem)
          .innerJoin(reservation, eq(reservation.reservationId, reservationItem.reservationId))
          .where(eq(reservationItem.reservationItemId, item.itemId));

        if (hold.expired) {
          return { error: "This table hold has expired." };
        }

        const [proof] = await tx
          .select({ id: paymentProof.proofId, screenshotUrl: paymentProof.screenshotUrl })
          .from(paymentProof)
          .where(and(
            eq(paymentProof.reservationItemId, item.itemId),
            eq(paymentProof.status, "pending"),
          ))
          .limit(1);

        if (decision === "Confirmed" && Number(item.unitPrice) > 0 && !proof?.screenshotUrl) {
          return { error: "The guest must submit payment proof before you can approve this table." };
        }

        const [updated] = await updatePending(tx);
        if (updated && proof) {
          await tx
            .update(paymentProof)
            .set(decision === "Confirmed"
              ? { status: "succeeded", paidAt: new Date() }
              : { status: "failed" })
            .where(eq(paymentProof.proofId, proof.id));
        }
        return { updated };
      })
    : { updated: (await updatePending(db))[0] };

  if ("error" in result && result.error) {
    return { ok: false, error: result.error };
  }
  const { updated } = result;

  if (!updated) {
    return { ok: false, error: "This reservation was already decided." };
  }

  // Refresh the dashboard as soon as the booking decision is saved.
  revalidatePath("/bookings");
  revalidatePath("/dashboard");

  // 3. Notify the guest
  await sendPushToProfile(
    updated.attendeeId,
    "Reservation update",
    decision === "Confirmed"
      ? "Your reservation has been confirmed."
      : "Your reservation was not approved.",
  );
  return { ok: true };
}
