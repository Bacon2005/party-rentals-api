import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db"; // adjust to your drizzle client path
import { event, eventTable, eventTicket } from "@/db/schema"; // adjust path
import { createEventTableSchema, toEventTableDto } from "@/lib/eventTable-dto"; // adjust path
import { createEventTicketSchema } from "@/lib/eventTicket-dto";

const uuidSchema = z.string().uuid();

// GET /api/table               -> all tables
// GET /api/table?id=<uuid>     -> one table
// GET /api/table?eventId=<uuid> -> all tables for an event
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
      const [table] = await db
        .select()
        .from(eventTable)
        .where(eq(eventTable.tableId, id));

      if (!table) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }
      return NextResponse.json(toEventTableDto(table));
    }

    if (eventId && !uuidSchema.safeParse(eventId).success) {
      return NextResponse.json(
        { error: "eventId must be a valid UUID" },
        { status: 400 },
      );
    }

    const query = db.select().from(eventTable);
    const rows = eventId
      ? await query.where(eq(eventTable.eventId, eventId))
      : await query;

    return NextResponse.json(rows.map(toEventTableDto));
  } catch (error) {
    console.error("GET /api/table failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/table
// body: { eventId, label, tablePrice, status?, capacity? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createEventTableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { eventId, label, tablePrice, status, capacity } = parsed.data;

    // Make sure the event exists (otherwise the foreign key would throw)
    const [parentEvent] = await db
      .select({ eventId: event.eventId })
      .from(event)
      .where(eq(event.eventId, eventId));

    if (!parentEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const [created] = await db
      .insert(eventTable)
      .values({
        eventId,
        label,
        tablePrice: tablePrice.toFixed(2), // numeric columns take strings
        status: status ?? null,
        capacity: capacity ?? null,
      })
      .returning();

    return NextResponse.json(toEventTableDto(created), { status: 201 });
  } catch (error) {
    console.error("POST /api/table failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
