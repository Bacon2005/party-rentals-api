// app/(app)/events/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { event } from "@/db/schema";
import { verifyUser } from "@/lib/auth";

export type UpdateEventInput = {
  eventId: string;
  name: string;
  description: string;
  location: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateEvent(input: UpdateEventInput): Promise<ActionResult> {
  const profile = await verifyUser();

  const name = input.name.trim();
  const location = input.location.trim();
  const start = new Date(input.startTime);
  const end = new Date(input.endTime);

  if (!name) return { ok: false, error: "Event name is required." };
  if (!location) return { ok: false, error: "Location is required." };
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return { ok: false, error: "Enter a valid start and end time." };
  if (end <= start)
    return { ok: false, error: "The end time must be after the start time." };

  // The host check and the status check live in the WHERE clause, so
  // the update only happens if this host owns an event that is still Upcoming.
  const [updated] = await db
    .update(event)
    .set({
      eventName: name,
      description: input.description.trim(),
      location,
      startTime: start,
      endTime: end,
    })
    .where(
      and(
        eq(event.eventId, input.eventId),
        eq(event.hostId, profile.id),
        eq(event.status, "Upcoming"),
      ),
    )
    .returning({ id: event.eventId });

  if (!updated)
    return { ok: false, error: "Event not found, or it can no longer be edited." };

  revalidatePath("/events");
  return { ok: true };
}