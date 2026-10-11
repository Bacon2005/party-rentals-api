import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------
// PROFILES (your existing table, unchanged)
// ---------------------------------------------------------------------
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().default(""),
    name: text("name").notNull(),
    role: text("role").notNull().default("client"),
  },
  (table) => [
    uniqueIndex("profiles_one_admin")
      .on(table.role)
      .where(sql`${table.role} = 'admin'`),
  ],
).enableRLS();

// ---------------------------------------------------------------------
// EVENT
// ---------------------------------------------------------------------
export const event = pgTable(
  "event",
  {
    eventId: uuid("event_id").primaryKey().defaultRandom(),
    hostId: uuid("host_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    eventName: varchar("event_name").notNull(),
    map: varchar("map"), // image URL
    description: varchar("description"),
    capacity: integer("capacity"),
    location: varchar("location"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    totalEarned: doublePrecision("total_earned").notNull().default(0),
    paymentQrUrl: varchar("payment_qr_url"),
    gcashAccountName: varchar("gcash_account_name"),
    status: text("status").notNull().default("draft"),
  },
  (table) => [
    index("idx_event_host_id").on(table.hostId),
    check(
      "event_status_check",
      sql`${table.status} in ('draft', 'published', 'cancelled')`,
    ),
    check("event_capacity_check", sql`${table.capacity} >= 0`),
    check("event_time_check", sql`${table.endTime} > ${table.startTime}`),
  ],
).enableRLS();

// ---------------------------------------------------------------------
// EVENT TABLE (physical tables at an event)
// ---------------------------------------------------------------------
export const eventTable = pgTable(
  "event_table",
  {
    tableId: uuid("table_id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.eventId, { onDelete: "cascade" }),
    label: varchar("label").notNull(),
    tablePrice: numeric("table_price", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("Available"),
    capacity: integer("capacity"),
  },
  (table) => [
    index("idx_event_table_event_id").on(table.eventId),
    check(
      "event_table_status_check",
      sql`${table.status} in ('Available', 'Reserved')`,
    ),
    check("event_table_price_check", sql`${table.tablePrice} >= 0`),
    check("event_table_capacity_check", sql`${table.capacity} > 0`),
  ],
).enableRLS();

// ---------------------------------------------------------------------
// EVENT TICKET
// ---------------------------------------------------------------------
export const eventTicket = pgTable(
  "event_ticket",
  {
    ticketId: uuid("ticket_id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.eventId, { onDelete: "cascade" }),
    name: varchar("name").notNull(),
    ticketPrice: numeric("ticket_price", { precision: 10, scale: 2 }).notNull(),
    salesStart: date("sales_start"),
    salesEnd: date("sales_end"),
  },
  (table) => [
    index("idx_event_ticket_event_id").on(table.eventId),
    check("event_ticket_price_check", sql`${table.ticketPrice} >= 0`),
    check(
      "event_ticket_sales_check",
      sql`${table.salesEnd} is null or ${table.salesStart} is null or ${table.salesEnd} >= ${table.salesStart}`,
    ),
  ],
).enableRLS();

// ---------------------------------------------------------------------
// RESERVATION
// ---------------------------------------------------------------------
export const reservation = pgTable(
  "reservation",
  {
    reservationId: uuid("reservation_id").primaryKey().defaultRandom(),
    attendeeId: uuid("attendee_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("Pending"),
    reservedAt: timestamp("reserved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_reservation_attendee_id").on(table.attendeeId),
    check(
      "reservation_status_check",
      sql`${table.status} in ('Pending', 'Confirmed', 'Denied')`,
    ),
  ],
).enableRLS();

// ---------------------------------------------------------------------
// RESERVATION ITEM (either a ticket OR a table, never both)
// ---------------------------------------------------------------------
export const reservationItem = pgTable(
  "reservation_item",
  {
    reservationItemId: uuid("reservation_item_id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservation.reservationId, { onDelete: "cascade" }),
    tableId: uuid("table_id").references(() => eventTable.tableId, {
      onDelete: "restrict",
    }),
    ticketId: uuid("ticket_id").references(() => eventTicket.ticketId, {
      onDelete: "restrict",
    }),
    itemType: text("item_type").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("idx_reservation_item_reservation_id").on(table.reservationId),
    index("idx_reservation_item_table_id").on(table.tableId),
    index("idx_reservation_item_ticket_id").on(table.ticketId),
    check(
      "reservation_item_type_check",
      sql`${table.itemType} in ('ticket', 'table')`,
    ),
    check("reservation_item_price_check", sql`${table.unitPrice} >= 0`),
    check(
      "reservation_item_exclusive_check",
      sql`(${table.itemType} = 'table' and ${table.tableId} is not null and ${table.ticketId} is null)
       or (${table.itemType} = 'ticket' and ${table.ticketId} is not null and ${table.tableId} is null)`,
    ),
  ],
).enableRLS();

// ---------------------------------------------------------------------
// PAYMENT PROOF
// ---------------------------------------------------------------------
export const paymentProof = pgTable(
  "payment_proof",
  {
    proofId: uuid("proof_id").primaryKey().defaultRandom(),
    reservationItemId: uuid("reservation_item_id")
      .notNull()
      .references(() => reservationItem.reservationItemId, {
        onDelete: "cascade",
      }),
    referenceNum: varchar("reference_num", { length: 100 }).notNull().unique(),
    screenshotUrl: varchar("screenshot_url"),
    status: text("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_payment_proof_item_id").on(table.reservationItemId),
    check(
      "payment_proof_status_check",
      sql`${table.status} in ('pending', 'succeeded', 'failed')`,
    ),
  ],
).enableRLS();
