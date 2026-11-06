import { NextResponse } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  paymentProof,
  reservation,
  reservationItem,
  profiles,
} from "@/db/schema";
import { createPaymentSchema } from "@/lib/payment-dto";

// GET /api/payments?eventId=<uuid>&reservationId=<uuid>  (both optional)
export async function GET(req: Request) {
  const user = await getProfile(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filters = z
    .object({
      eventId: z.string().uuid().optional(),
      reservationId: z.string().uuid().optional(),
    })
    .safeParse({
      eventId: searchParams.get("eventId") ?? undefined,
      reservationId: searchParams.get("reservationId") ?? undefined,
    });
  if (!filters.success) {
    return NextResponse.json(
      { error: "Invalid query", details: filters.error.flatten() },
      { status: 400 },
    );
  }

  // An item belongs to either a ticket or a table, so the event comes from whichever is set.
  const itemEventId = sql`coalesce(${eventTicket.eventId}, ${eventTable.eventId})`;

  const rows = await db
    .select({
      reservationId: reservation.reservationId,
      reservationStatus: reservation.status,
      reservedAt: reservation.reservedAt,

      reservationItemId: reservationItem.reservationItemId,
      itemType: reservationItem.itemType, // "ticket" | "table"
      itemName: sql<
        string | null
      >`coalesce(${eventTicket.name}, ${eventTable.label})`,
      unitPrice: reservationItem.unitPrice,

      eventId: event.eventId,
      eventName: event.eventName,

      attendeeName: profiles.name,
      attendeeEmail: profiles.email,

      paymentStatus: paymentProof.status,
      referenceNum: paymentProof.referenceNum,
      screenshotUrl: paymentProof.screenshotUrl,
      paidAt: paymentProof.paidAt,
    })
    .from(reservationItem)
    .innerJoin(
      reservation,
      eq(reservation.reservationId, reservationItem.reservationId),
    )
    .innerJoin(profiles, eq(profiles.id, reservation.attendeeId))
    .leftJoin(eventTicket, eq(eventTicket.ticketId, reservationItem.ticketId))
    .leftJoin(eventTable, eq(eventTable.tableId, reservationItem.tableId))
    .innerJoin(event, eq(event.eventId, itemEventId))
    .leftJoin(
      paymentProof,
      eq(paymentProof.reservationItemId, reservationItem.reservationItemId),
    )
    .where(
      and(
        // Attendees see their own reservations; hosts see reservations for their events.
        or(eq(reservation.attendeeId, user.id), eq(event.hostId, user.id)),
        filters.data.eventId
          ? eq(event.eventId, filters.data.eventId)
          : undefined,
        filters.data.reservationId
          ? eq(reservation.reservationId, filters.data.reservationId)
          : undefined,
      ),
    );

  return NextResponse.json({
    data: rows.map((r) => ({
      ...r,
      unitPrice: Number(r.unitPrice), // numeric comes back as a string
    })),
  });
}

// POST /api/payments  -> attendee submits payment proof for one reservation item
export async function POST(req: Request) {
  const user = await getProfile(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createPaymentSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Make sure the item belongs to the caller's own reservation.
  const [owned] = await db
    .select({ id: reservationItem.reservationItemId })
    .from(reservationItem)
    .innerJoin(
      reservation,
      eq(reservation.reservationId, reservationItem.reservationId),
    )
    .where(
      and(
        eq(reservationItem.reservationItemId, d.reservationItemId),
        eq(reservation.attendeeId, user.id),
      ),
    )
    .limit(1);

  if (!owned) {
    return NextResponse.json(
      { error: "Reservation item not found" },
      { status: 404 },
    );
  }

  try {
    const [created] = await db
      .insert(paymentProof)
      .values({
        reservationItemId: d.reservationItemId,
        referenceNum: d.referenceNum,
        screenshotUrl: d.screenshotUrl,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    // Postgres unique violation (reference_num looks unique in your schema)
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "This reference number was already submitted" },
        { status: 409 },
      );
    }
    throw err;
  }
}
