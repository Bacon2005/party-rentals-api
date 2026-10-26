import { z } from "zod";
import type { eventTable, eventTicket } from "@/db/schema"; // adjust path

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

// Incoming data when creating a ticket (POST body)
export const createEventTableSchema = z.object({
  eventId: z.string().uuid("eventId must be a valid UUID"),
  label: z.string().min(1, "label is required").max(255),
  tablePrice: z.number().min(0).max(99999999.99), // numeric(10,2)
  status: z.string().min(1, "label is required").max(255),
  capacity: z.number().min(1, "Must be at least 1").max(255),
});

export type CreateEventTableDto = z.infer<typeof createEventTableSchema>;

// Outgoing shape sent to the client
export interface EventTableDto {
  tableId: string;
  eventId: string;
  lable: string;
  tablePrice: number;
  status: string;
  capacity: number | null;
}

// Drizzle returns numeric columns as strings, so convert to a number here
export function toEventTableDto(
  row: typeof eventTable.$inferSelect,
): EventTableDto {
  return {
    tableId: row.tableId,
    eventId: row.eventId,
    lable: row.label,
    tablePrice: Number(row.tablePrice),
    status: row.status,
    capacity: row.capacity,
  };
}
