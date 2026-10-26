import { z } from "zod";
import type { eventTicket } from "@/db/schema"; // adjust path

// Restricts optional ticket sale dates to the calendar-date format used by the API.
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

// Validates ticket creation requests before they are used to create a database row.
export const createEventTicketSchema = z
  .object({
    eventId: z.string().uuid("eventId must be a valid UUID"),
    name: z.string().min(1, "name is required").max(255),
    ticketPrice: z.number().min(0).max(99999999.99), // numeric(10,2)
    salesStart: dateString.nullish(),
    salesEnd: dateString.nullish(),
  })
  .refine((d) => !d.salesStart || !d.salesEnd || d.salesEnd >= d.salesStart, {
    message: "salesEnd must be on or after salesStart",
    path: ["salesEnd"],
  });

// Keeps the TypeScript request type aligned with the runtime validation schema.
export type CreateEventTicketDto = z.infer<typeof createEventTicketSchema>;

// Defines the stable ticket response shape, independent of database column types.
export interface EventTicketDto {
  ticketId: string;
  eventId: string;
  name: string;
  ticketPrice: number;
  salesStart: string | null;
  salesEnd: string | null;
}

// Maps a database row to the client response shape and converts numeric price strings to numbers.
export function toEventTicketDto(
  row: typeof eventTicket.$inferSelect,
): EventTicketDto {
  return {
    ticketId: row.ticketId,
    eventId: row.eventId,
    name: row.name,
    ticketPrice: Number(row.ticketPrice),
    salesStart: row.salesStart,
    salesEnd: row.salesEnd,
  };
}
