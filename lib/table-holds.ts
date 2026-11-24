import { sql } from "drizzle-orm";
import { paymentProof, reservation, reservationItem } from "@/db/schema";

export const tablePaymentSubmitted = sql<boolean>`exists (
  select 1 from ${paymentProof} as submitted
  where submitted.reservation_item_id = ${reservationItem}.reservation_item_id
    and submitted.status in ('pending', 'succeeded')
)`;

export const tableHoldDeadline = sql<Date>`(
  ${reservation}.reserved_at + interval '15 minutes'
)`.mapWith(reservation.reservedAt);

export const tableHoldExpired = sql<boolean>`(
  ${reservation}.status = 'Pending'
  and ${reservationItem}.item_type = 'table'
  and ${reservationItem}.unit_price > 0
  and ${tableHoldDeadline} <= statement_timestamp()
  and not ${tablePaymentSubmitted}
)`;

export const effectiveReservationStatus = sql<string>`case
  when ${tableHoldExpired} then 'Expired'
  else ${reservation}.status
end`;
