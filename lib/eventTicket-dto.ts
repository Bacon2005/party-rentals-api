import { z } from "zod";
import type { eventTicket } from "@/db/schema"; // adjust path

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

// Incoming data when creating a ticket (POST body)
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

export type CreateEventTicketDto = z.infer<typeof createEventTicketSchema>;

// Outgoing shape sent to the client
export interface EventTicketDto {
  ticketId: string;
  eventId: string;
  name: string;
  ticketPrice: number;
  salesStart: string | null;
  salesEnd: string | null;
}

// Drizzle returns numeric columns as strings, so convert to a number here
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
