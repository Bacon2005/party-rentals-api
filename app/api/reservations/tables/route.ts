import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  event,
  eventTable,
  reservation,
  reservationItem,
  tableReservationGuests,
} from "@/db/schema";
import { getProfile } from "@/lib/auth";
import {
  effectiveReservationStatus,
  tableHoldDeadline,
  tableHoldExpired,
  tablePaymentSubmitted,
} from "@/lib/table-holds";

const itemIdSchema = z.string().uuid();
const addGuestsSchema = z.object({
  reservationItemId: itemIdSchema,
  savedCount: z.number().int().nonnegative(),
  names: z.array(z.string().trim().min(1).max(120)).min(1).max(255),
});

export async function GET(req: Request) {
  const user = await getProfile(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = new URL(req.url).searchParams.get("reservationItemId");
  if (itemId !== null && !itemIdSchema.safeParse(itemId).success) {
    return NextResponse.json({ error: "Invalid reservation item" }, { status: 400 });
  }

  const rows = await db
    .select({
      reservationItemId: reservationItem.reservationItemId,
      reservationStatus: effectiveReservationStatus,
      eventId: event.eventId,
      eventName: event.eventName,
      eventStartTime: event.startTime,
      eventEndTime: event.endTime,
      tableLabel: eventTable.label,
      capacity: eventTable.capacity,
      unitPrice: reservationItem.unitPrice,
      guestNames: tableReservationGuests.names,
      paymentSubmitted: tablePaymentSubmitted,
      deadline: tableHoldDeadline,
    })
    .from(reservationItem)
    .innerJoin(reservation, eq(reservation.reservationId, reservationItem.reservationId))
    .innerJoin(eventTable, eq(eventTable.tableId, reservationItem.tableId))
    .innerJoin(event, eq(event.eventId, eventTable.eventId))
    .leftJoin(
      tableReservationGuests,
      eq(tableReservationGuests.reservationItemId, reservationItem.reservationItemId),
    )
    .where(and(
      eq(reservation.attendeeId, user.id),
      eq(reservationItem.itemType, "table"),
      itemId ? eq(reservationItem.reservationItemId, itemId) : undefined,
    ))
    .orderBy(desc(reservation.reservedAt), reservationItem.reservationItemId);

  return NextResponse.json({
    data: rows.map(({ deadline, ...row }) => ({
      ...row,
      unitPrice: Number(row.unitPrice),
      guestNames: row.guestNames ?? [],
      expiresAt:
        row.reservationStatus === "Pending" &&
        Number(row.unitPrice) > 0 &&
        !row.paymentSubmitted
          ? deadline.toISOString()
          : null,
    })),
  });
}

export async function DELETE(req: Request) {
  const user = await getProfile(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = itemIdSchema.safeParse(new URL(req.url).searchParams.get("reservationItemId"));
  if (!itemId.success) {
    return NextResponse.json({ error: "Invalid reservation item" }, { status: 400 });
  }

  const result = await db.transaction(async (tx) => {
    const [booking] = await tx
      .select({ id: reservation.reservationId, status: reservation.status })
      .from(reservationItem)
      .innerJoin(reservation, eq(reservation.reservationId, reservationItem.reservationId))
      .where(and(
        eq(reservationItem.reservationItemId, itemId.data),
        eq(reservation.attendeeId, user.id),
        eq(reservationItem.itemType, "table"),
      ))
      .for("update", { of: reservation });

    if (!booking) return { status: 404, error: "Table reservation not found." };
    if (booking.status === "Cancelled") return { status: 204 };
    if (booking.status !== "Pending") {
      return { status: 409, error: "Only pending table reservations can be cancelled." };
    }

    const [hold] = await tx
      .select({ paymentSubmitted: tablePaymentSubmitted, expired: tableHoldExpired })
      .from(reservationItem)
      .innerJoin(reservation, eq(reservation.reservationId, reservationItem.reservationId))
      .where(eq(reservationItem.reservationItemId, itemId.data));

    if (hold.paymentSubmitted) {
      return { status: 409, error: "Payment proof has already been submitted." };
    }
    if (hold.expired) return { status: 409, error: "This table hold has already expired." };

    await tx
      .update(reservation)
      .set({ status: "Cancelled" })
      .where(eq(reservation.reservationId, booking.id));

    return { status: 204 };
  });

  return result.status === 204
    ? new Response(null, { status: 204 })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

export async function PATCH(req: Request) {
  const user = await getProfile(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = addGuestsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter guest names between 1 and 120 characters." },
      { status: 400 },
    );
  }

  const { reservationItemId, names, savedCount } = parsed.data;
  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        status: reservation.status,
        capacity: eventTable.capacity,
      })
      .from(reservationItem)
      .innerJoin(reservation, eq(reservation.reservationId, reservationItem.reservationId))
      .innerJoin(eventTable, eq(eventTable.tableId, reservationItem.tableId))
      .where(and(
        eq(reservationItem.reservationItemId, reservationItemId),
        eq(reservation.attendeeId, user.id),
        eq(reservationItem.itemType, "table"),
      ))
      .for("update", { of: reservationItem });

    if (!row) return { status: 404, body: { error: "Table reservation not found." } };
    if (row.status !== "Confirmed") {
      return { status: 409, body: { error: "Guest names can be saved once the reservation is approved." } };
    }

    const [guestList] = await tx
      .select({ names: tableReservationGuests.names })
      .from(tableReservationGuests)
      .where(eq(tableReservationGuests.reservationItemId, reservationItemId));
    const savedNames = guestList?.names ?? [];

    if (savedNames.length !== savedCount) {
      // If a save succeeded before its response was lost, a retry can return it.
      if (names.every((name, index) => savedNames[savedCount + index] === name)) {
        return { status: 200, body: { data: savedNames } };
      }
      return { status: 409, body: { error: "The guest list changed. Refresh your reservations and try again." } };
    }

    const guestNames = [...savedNames, ...names];
    if (row.capacity !== null && guestNames.length > row.capacity) {
      return { status: 409, body: { error: "The guest list exceeds the table capacity." } };
    }

    await tx
      .insert(tableReservationGuests)
      .values({ reservationItemId, names: guestNames })
      .onConflictDoUpdate({
        target: tableReservationGuests.reservationItemId,
        set: { names: guestNames },
      });

    return { status: 200, body: { data: guestNames } };
  });

  return NextResponse.json(result.body, { status: result.status });
}
