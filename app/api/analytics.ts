import type { AnalyticsRange, BookingsGuestsResponse } from "@/types/analytics";

// Temporary mock data.
// Replace this data source when the backend is ready.
const mockData = [
  { month: "Jan", bookings: 45, guests: 75 },
  { month: "Feb", bookings: 46, guests: 71 },
  { month: "Mar", bookings: 57, guests: 86 },
  { month: "Apr", bookings: 66, guests: 105 },
  { month: "May", bookings: 84, guests: 132 },
  { month: "Jun", bookings: 49, guests: 96 },
  { month: "Jul", bookings: 71, guests: 124 },
  { month: "Aug", bookings: 63, guests: 102 },
  { month: "Sep", bookings: 69, guests: 101 },
  { month: "Oct", bookings: 108, guests: 132 },
  { month: "Nov", bookings: 158, guests: 184 },
  { month: "Dec", bookings: 141, guests: 164 },
];

export async function getBookingsGuestsTrend(
  range: AnalyticsRange,
): Promise<BookingsGuestsResponse> {
  // TODO: Replace with a backend request.
  // Example: fetch(`/api/analytics/bookings-guests?range=${range}`)

  return {
    range,
    data: mockData.slice(-range),
  };
}
