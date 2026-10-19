import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db"; // adjust to your drizzle client path
import { event, eventTicket } from "@/db/schema"; // adjust path
import {
  createEventTicketSchema,
  toEventTicketDto,
} from "@/lib/eventTicket-dto"; // adjust path

const uuidSchema = z.string().uuid();

// GET /api/ticket               -> all tickets
// GET /api/ticket?id=<uuid>     -> one ticket
// GET /api/ticket?eventId=<uuid> -> all tickets for an event
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const eventId = searchParams.get("eventId");

    if (id) {
      if (!uuidSchema.safeParse(id).success) {
        return NextResponse.json(
          { error: "id must be a valid UUID" },
          { status: 400 },
        );
      }
      const [ticket] = await db
        .select()
        .from(eventTicket)
        .where(eq(eventTicket.ticketId, id));

      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 },
        );
      }
      return NextResponse.json(toEventTicketDto(ticket));
    }

    if (eventId && !uuidSchema.safeParse(eventId).success) {
      return NextResponse.json(
        { error: "eventId must be a valid UUID" },
        { status: 400 },
      );
    }

    const query = db.select().from(eventTicket);
    const rows = eventId
      ? await query.where(eq(eventTicket.eventId, eventId))
      : await query;

    return NextResponse.json(rows.map(toEventTicketDto));
  } catch (error) {
    console.error("GET /api/ticket failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/ticket
// body: { eventId, name, ticketPrice, salesStart?, salesEnd? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createEventTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { eventId, name, ticketPrice, salesStart, salesEnd } = parsed.data;

    // Make sure the event exists (otherwise the foreign key would throw)
    const [parentEvent] = await db
      .select({ eventId: event.eventId })
      .from(event)
      .where(eq(event.eventId, eventId));

    if (!parentEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const [created] = await db
      .insert(eventTicket)
      .values({
        eventId,
        name,
        ticketPrice: ticketPrice.toFixed(2), // numeric columns take strings
        salesStart: salesStart ?? null,
        salesEnd: salesEnd ?? null,
      })
      .returning();

    return NextResponse.json(toEventTicketDto(created), { status: 201 });
  } catch (error) {
    console.error("POST /api/ticket failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/ticket?id=<uuid>
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");

    if (!id || !uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: "A valid id is required" },
        { status: 400 },
      );
    }

    const deleted = await db
      .delete(eventTicket)
      .where(eq(eventTicket.ticketId, id))
      .returning({ ticketId: eventTicket.ticketId });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Ticket deleted" });
  } catch (error) {
    console.error("DELETE /api/ticket failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
