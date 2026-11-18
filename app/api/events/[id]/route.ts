import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { event, eventTicket, eventTable } from "@/db/schema";
import { getProfile } from "@/lib/auth";
import { idSchema, toEventDto, updateEventSchema } from "@/lib/event-dto";
import { toEventTicketDto } from "@/lib/eventTicket-dto";
import { toEventTableDto } from "@/lib/eventTable-dto";

// Next.js 15: params is a Promise. (On Next 14, use { params }: { params: { id: string } } and drop the await.)
type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const notFound = () =>
  NextResponse.json({ error: "Event not found" }, { status: 404 });

async function parseId(ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = idSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

// GET /api/events/:id -> published event, or one the caller hosts
export async function GET(req: Request, ctx: Ctx) {
  const user = await getProfile(req);
  if (!user) return unauthorized();

  const id = await parseId(ctx);
  if (!id) return notFound();

  const [row] = await db
    .select()
    .from(event)
    .where(
      and(
        eq(event.eventId, id),
        or(eq(event.status, "published"), eq(event.hostId, user.id)),
      ),
    );

  const [tickets, tables] = await Promise.all([
    db
      .select()
      .from(eventTicket)
      .where(eq(eventTicket.eventId, id))
      .orderBy(eventTicket.ticketPrice),
    db
      .select()
      .from(eventTable)
      .where(eq(eventTable.eventId, id))
      .orderBy(eventTable.label),
  ]);

  return NextResponse.json({
    ...toEventDto(row),
    tickets: tickets.map(toEventTicketDto),
    tables: tables.map(toEventTableDto),
  });
}

// PATCH /api/events/:id -> host only, partial update
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getProfile(req);
  if (!user) return unauthorized();

  const id = await parseId(ctx);
  if (!id) return notFound();

  const parsed = updateEventSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;
  if (Object.values(d).every((v) => v === undefined)) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  // Drizzle skips keys that are undefined, so only sent fields are updated.
  const [row] = await db
    .update(event)
    .set({
      eventName: d.name,
      description: d.description,
      location: d.location,
      capacity: d.capacity,
      startTime: d.startTime ? new Date(d.startTime) : undefined,
      endTime: d.endTime ? new Date(d.endTime) : undefined,
      status: d.status,
      map: d.mapUrl,
      paymentQrUrl: d.paymentQrUrl,
      eventImage: d.eventImageUrl,
    })
    .where(and(eq(event.eventId, id), eq(event.hostId, user.id)))
    .returning();

  return row ? NextResponse.json(toEventDto(row)) : notFound();
}

// DELETE /api/events/:id -> host only
export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getProfile(req);
  if (!user) return unauthorized();

  const id = await parseId(ctx);
  if (!id) return notFound();

  const deleted = await db
    .delete(event)
    .where(and(eq(event.eventId, id), eq(event.hostId, user.id)))
    .returning({ id: event.eventId });

  return deleted.length ? new NextResponse(null, { status: 204 }) : notFound();
}
