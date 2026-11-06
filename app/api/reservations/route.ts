import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  event,
  eventTable,
  eventTicket,
  profiles,
  reservation,
  reservationItem,
} from "@/db/schema";
import { getProfile } from "@/lib/auth";

const reservationFiltersSchema = z.object({
  eventId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
});

const createReservationSchema = z.object({
  ticketId: z.string().uuid(),
});

// GET /api/reservations?eventId=<uuid>&reservationId=<uuid> (both optional)
export async function GET(req: Request) {
  const user = await getProfile(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filters = reservationFiltersSchema.safeParse({
    eventId: searchParams.get("eventId") ?? undefined,
    reservationId: searchParams.get("reservationId") ?? undefined,
  });
  if (!filters.success) {
    return NextResponse.json(
      { error: "Invalid query", details: filters.error.flatten() },
      { status: 400 },
    );
  }

  const itemEventId = sql`coalesce(${eventTicket.eventId}, ${eventTable.eventId})`;
  const rows = await db
    .select({
      reservationId: reservation.reservationId,
      reservationStatus: reservation.status,
      reservedAt: reservation.reservedAt,
      reservationItemId: reservationItem.reservationItemId,
      itemType: reservationItem.itemType,
      itemName: sql<string | null>`coalesce(${eventTicket.name}, ${eventTable.label})`,
      ticketId: reservationItem.ticketId,
      tableId: reservationItem.tableId,
      unitPrice: reservationItem.unitPrice,
      eventId: event.eventId,
      eventName: event.eventName,
      eventStartTime: event.startTime,
      eventEndTime: event.endTime,
      attendeeName: profiles.name,
      attendeeEmail: profiles.email,
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
    .where(
      and(
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
    data: rows.map((row) => ({
      ...row,
      unitPrice: Number(row.unitPrice),
    })),
  });
}

// POST /api/reservations -> create one reservation item for a ticket
export async function POST(req: Request) {
  const user = await getProfile(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createReservationSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ ticket: eventTicket, parentEvent: event })
      .from(eventTicket)
      .innerJoin(event, eq(eventTicket.eventId, event.eventId))
      .where(eq(eventTicket.ticketId, parsed.data.ticketId))
      .limit(1);

    if (!row || row.parentEvent.status !== "published") {
      return {
        status: 404,
        body: { error: "Published ticket not found" },
      };
    }

    const [lockedEvent] = await tx
      .select({ capacity: event.capacity, status: event.status })
      .from(event)
      .where(eq(event.eventId, row.parentEvent.eventId))
      .for("update");

    if (!lockedEvent || lockedEvent.status !== "published") {
      return {
        status: 404,
        body: { error: "Published ticket not found" },
      };
    }

    if (lockedEvent.capacity !== null) {
      const [{ count: eventTicketCount }] = await tx
        .select({ count: count() })
        .from(reservationItem)
        .innerJoin(
          reservation,
          eq(reservation.reservationId, reservationItem.reservationId),
        )
        .innerJoin(
          eventTicket,
          eq(eventTicket.ticketId, reservationItem.ticketId),
        )
        .where(
          and(
            eq(eventTicket.eventId, row.parentEvent.eventId),
            inArray(reservation.status, ["Pending", "Confirmed"]),
          ),
        );

      if (eventTicketCount >= lockedEvent.capacity) {
        return { status: 409, body: { error: "This event is at capacity" } };
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    if (row.ticket.salesStart && today < row.ticket.salesStart) {
      return { status: 409, body: { error: "Ticket sales have not started" } };
    }
    if (row.ticket.salesEnd && today > row.ticket.salesEnd) {
      return { status: 409, body: { error: "Ticket sales have ended" } };
    }

    const paymentRequired = Number(row.ticket.ticketPrice) > 0;
    const [createdReservation] = await tx
      .insert(reservation)
      .values({
        attendeeId: user.id,
        status: paymentRequired ? "Pending" : "Confirmed",
      })
      .returning({ reservationId: reservation.reservationId });

    const [createdItem] = await tx
      .insert(reservationItem)
      .values({
        reservationId: createdReservation.reservationId,
        ticketId: row.ticket.ticketId,
        itemType: "ticket",
        unitPrice: row.ticket.ticketPrice,
      })
      .returning({ reservationItemId: reservationItem.reservationItemId });

    return {
      status: 201,
      body: {
        data: {
          reservationId: createdReservation.reservationId,
          reservationItemId: createdItem.reservationItemId,
          ticketId: row.ticket.ticketId,
          paymentRequired,
        },
      },
    };
  });

  return NextResponse.json(result.body, { status: result.status });
}
