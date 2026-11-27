import type { AnalyticsRange, BookingsGuestsResponse } from "@/types/analytics";

export async function getBookingsGuestsTrend(
  range: AnalyticsRange,
): Promise<BookingsGuestsResponse> {
  const response = await fetch(`/api/analytics/bookings-guests?range=${range}`);
  if (!response.ok) throw new Error("Unable to load bookings and guests data.");
  return response.json();
}
