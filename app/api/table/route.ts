import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db"; // adjust to your drizzle client path
import { event, eventTable, eventTicket } from "@/db/schema"; // adjust path
import { createEventTableSchema, toEventTableDto } from "@/lib/eventTable-dto"; // adjust path

const uuidSchema = z.string().uuid();

// GET /api/ticket               -> all tables
// GET /api/ticket?id=<uuid>     -> one table
// GET /api/ticket?eventId=<uuid> -> all tables for an event
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