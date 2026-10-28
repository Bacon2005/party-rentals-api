import type { getReservations } from "./data";
import type { Booking, BookingKind, BookingStatus } from "./types";

type Row = Awaited<ReturnType<typeof getReservations>>[number];

const TZ = "Asia/Manila";

const fmtDate = (d: Date | string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: TZ,
      })
    : "—";

const fmtTime = (d: Date | string | null) =>
  d
    ? new Date(d).toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: TZ,
      })
    : "—";

function toStatus(s: string | null): BookingStatus {
  const v = (s ?? "").toLowerCase();
  if (v.startsWith("confirm") || v === "paid" || v === "approved")
    return "Confirmed";
  if (v.startsWith("cancel") || v === "rejected") return "Cancelled";
  return "Pending";
}

function toKind(type: string): BookingKind {
  const t = type.toLowerCase();
  if (t.includes("table")) return "table";
  if (t.includes("vip")) return "vip";
  return "general";
}

export function toBookings(rows: Row[]): Booking[] {
  return rows.map((r, i) => {
    const type = r.bookingType ?? "—";
    return {
      // reservationId can repeat if a reservation has several items
      id: `${r.reservationId}-${i}`,
      name: r.guestName ?? "Unknown",
      email: r.email ?? "",
      phone: "—",
      event: r.eventName,
      eventDate: "—",
      eventTime: "—",
      type,
      kind: toKind(type),
      guests: 1,
      amount: Number(r.amount ?? 0),
      bookingDate: fmtDate(r.bookingDate),
      bookingTime: fmtTime(r.bookingDate),
      status: toStatus(r.status),
      paymentMethod: "—",
    };
  });
}
