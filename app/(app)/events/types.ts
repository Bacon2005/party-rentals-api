export type EventStatus = "Upcoming" | "Ongoing" | "Finished";

// types.ts
export interface Event {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  startTime: string;
  endTime: string;
  status: EventStatus;
  location: string;
  createdAt: string;
  bookings: number;
  guests: number;
  revenue: number;
}

export interface EventFilterState {
  search: string;
  status: EventStatus | "";
}
