import { z } from "zod";
import type { event } from "@/db/schema";

const IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-images/`;
const QR_IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/hostQR/`;
const EVENT_IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-graphics/`;

// Shared field rules keep create and update requests consistent with the event API.
const baseEvent = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().max(300).optional(),
  capacity: z.number().int().min(0).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(["draft", "published", "cancelled"]).optional(),
  mapUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith(IMAGE_PREFIX), "Invalid image URL")
    .nullable()
    .optional(),
  paymentQrUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith(QR_IMAGE_PREFIX), "Invalid image URL")
    .nullable()
    .optional(),
  eventImageUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith(EVENT_IMAGE_PREFIX), "Invalid image URL")
    .nullable()
    .optional(),
});

// Validates complete event creation payloads and rejects events ending before they start.
export const createEventSchema = baseEvent.refine(
  (d) => new Date(d.endTime) > new Date(d.startTime),
  { message: "endTime must be after startTime", path: ["endTime"] },
);

// Validates partial edits while checking the time order whenever both times are provided.
export const updateEventSchema = baseEvent
  .partial()
  .refine(
    (d) =>
      !d.startTime || !d.endTime || new Date(d.endTime) > new Date(d.startTime),
    { message: "endTime must be after startTime", path: ["endTime"] },
  );

// Ensures event identifiers from requests have the UUID format used by the database.
export const idSchema = z.string().uuid();

/**
 * Maps database field names, nullable values, and Date objects to the stable
 * event shape consumed by the Expo app.
 */
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
    mapUrl: row.map,
    paymentQrUrl: row.paymentQrUrl,
    eventImageUrl: row.eventImage,
  };
}
