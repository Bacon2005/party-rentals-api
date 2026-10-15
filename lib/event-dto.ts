import { z } from "zod";
import type { event } from "@/db/schema";

const baseEvent = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  capacity: z.number().int().min(0).optional(),
  startTime: z.string().datetime(), // ISO string, e.g. new Date().toISOString()
  endTime: z.string().datetime(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
});

export const createEventSchema = baseEvent.refine(
  (d) => new Date(d.endTime) > new Date(d.startTime),
  { message: "endTime must be after startTime", path: ["endTime"] },
);

export const updateEventSchema = baseEvent
  .partial()
  .refine(
    (d) =>
      !d.startTime || !d.endTime || new Date(d.endTime) > new Date(d.startTime),
    { message: "endTime must be after startTime", path: ["endTime"] },
  );

export const idSchema = z.string().uuid();

/** Converts a DB row into the shape the Expo app expects. */
export function toEventDto(row: typeof event.$inferSelect) {
  return {
    id: row.eventId,
    host: row.hostId,
    name: row.eventName,
    description: row.description ?? "",
    location: row.location ?? "",
    capacity: row.capacity ?? 0,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status,
  };
}
