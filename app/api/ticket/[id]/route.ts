import { NextResponse } from "next/server";
import { idSchema, toEventDto } from "@/lib/event-dto";
import { toEventTicketDto } from "@/lib/eventTicket-dto";
import { and, eq, or } from "drizzle-orm";
import { event, eventTicket } from "@/db/schema";
import { getProfile } from "@/lib/auth";
import { db } from "@/db";

type Ctx = { params: Promise<{ id: string }> };

const unauthorized = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const notFound = () =>
  NextResponse.json({ error: "Ticket not found" }, { status: 404 });

async function parseId(ctx: Ctx) {
  const { id } = await ctx.params;
  const parsed = idSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await getProfile(req);
  if (!user) return unauthorized();

  const id = await parseId(ctx); // this is the ticket id
  if (!id) return notFound();

  const [row] = await db
    .select({ ticket: eventTicket, event })
    .from(eventTicket)
    .innerJoin(event, eq(eventTicket.eventId, event.eventId))
    .where(
      and(
        eq(eventTicket.ticketId, id),
        or(eq(event.status, "published"), eq(event.hostId, user.id)),
      ),
    );

  if (!row) return notFound();

  return NextResponse.json({
    ...toEventTicketDto(row.ticket),
    event: toEventDto(row.event),
  });
}
