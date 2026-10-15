export type AnalyticsRange = 3 | 6 | 12;

export interface BookingsGuestsDataPoint {
  month: string;
  bookings: number;
  guests: number;
}

export interface BookingsGuestsResponse {
  range: AnalyticsRange;
  data: BookingsGuestsDataPoint[];
}
