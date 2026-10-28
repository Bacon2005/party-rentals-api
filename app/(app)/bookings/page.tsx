import { connection } from "next/server";
import { getReservations } from "./data";
import { toBookings } from "./toBookings";
import BookingsPage from "./BookingsPage";
import { verifyUser } from "@/lib/auth";

export default async function Page() {
  await connection();
  const profile = await verifyUser();
  const reservations = await getReservations(profile.id);
  return <BookingsPage bookings={toBookings(reservations)} />;
}
