// data.ts
import { db } from "@/db";
import { desc, eq, sql } from "drizzle-orm";
import { event, eventTable, eventTicket, reservationItem } from "@/db/schema";
import type { Event, EventStatus } from "./types";

export async function getHostEvents(hostId: string): Promise<Event[]> {
  const rows = await db
    .select({
      id: event.eventId,
      name: event.eventName,
      description: event.description,
      imageUrl: event.eventImage,
      startTime: event.startTime,
      endTime: event.endTime,
      status: event.status,
      location: event.location,
      createdAt: event.createdAt,
    })
    .from(event)
    .where(eq(event.hostId, hostId))
    .orderBy(desc(event.startTime));

  const itemEventId = sql<string>`COALESCE(${eventTicket.eventId}, ${eventTable.eventId})`;

  const totals = await db
    .select({
      eventId: itemEventId,
      bookings:
        sql<number>`COUNT(DISTINCT ${reservationItem.reservationId})`.mapWith(
          Number,
        ),
      guests: sql<number>`COUNT(${reservationItem.reservationItemId})`.mapWith(
        Number,
      ),
      revenue:
        sql<number>`COALESCE(SUM(${reservationItem.unitPrice}), 0)`.mapWith(
          Number,
        ),
    })
    .from(reservationItem)
    .leftJoin(eventTicket, eq(reservationItem.ticketId, eventTicket.ticketId))
    .leftJoin(eventTable, eq(reservationItem.tableId, eventTable.tableId))
    .innerJoin(event, sql`${event.eventId} = ${itemEventId}`)
    .where(eq(event.hostId, hostId))
    .groupBy(itemEventId);

  const byEvent = new Map(totals.map((t) => [t.eventId, t]));

  return rows.map((e) => ({
  ...e,
  description: e.description ?? "",
  location: e.location ?? "",
  status: e.status as EventStatus,
  startTime: new Date(e.startTime).toISOString(),
  endTime: new Date(e.endTime).toISOString(),
  createdAt: new Date(e.createdAt).toISOString(),
  bookings: byEvent.get(e.id)?.bookings ?? 0,
  guests: byEvent.get(e.id)?.guests ?? 0,
  revenue: byEvent.get(e.id)?.revenue ?? 0,
}));
}
