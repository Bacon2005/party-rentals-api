import { NextResponse } from "next/server";
import { asc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { event } from "@/db/schema";
import { getProfile } from "@/lib/auth";
import { createEventSchema, toEventDto } from "@/lib/event-dto";

// GET /api/events  -> all published events + the caller's own drafts/cancelled
export async function GET(req: Request) {
  const user = await getProfile(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(event)
    .where(or(eq(event.status, "published"), eq(event.hostId, user.id)))
    .orderBy(asc(event.startTime));

  return NextResponse.json(rows.map(toEventDto));
}

// POST /api/events  -> create an event hosted by the caller
export async function POST(req: Request) {
  const user = await getProfile(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createEventSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const [row] = await db
    .insert(event)
    .values({
      hostId: user.id, // always taken from the token, never from the body
      eventName: d.name,
      description: d.description,
      location: d.location,
      capacity: d.capacity,
      startTime: new Date(d.startTime),
      endTime: new Date(d.endTime),
      status: d.status,
    })
    .returning();

  return NextResponse.json(toEventDto(row), { status: 201 });
}
