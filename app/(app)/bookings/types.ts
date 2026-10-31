export type BookingStatus = "Confirmed" | "Pending" | "Cancelled";
export type BookingKind = "vip" | "table" | "general";

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  event: string;
  eventDate: string;
  eventTime: string;
  type: string;
  kind: BookingKind;
  guests: number;
  amount: number;
  screenshotUrl: string | null;
  bookingDate: string;
  bookingTime: string;
  status: BookingStatus;
  paymentMethod: string;
}

export interface BookingFilterState {
  search: string;
  event: string;
  type: string;
  status: string;
}
