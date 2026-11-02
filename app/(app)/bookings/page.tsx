// app/(app)/bookings/page.tsx
import { getReservations } from "./data";
import { toBookings } from "./toBookings";
import BookingsPage from "./BookingsPage";
import { verifyUser } from "@/lib/auth";
import { Suspense } from "react";
import { BookingsSkeleton } from "@/components/Skeletons";
import { connection } from "next/server";

export default function Page() {
  return (
    <Suspense fallback={<BookingsSkeleton />}>
      <BookingsContent />
    </Suspense>
  );
}

async function BookingsContent() {
  await connection();
  // Gets the signed-in user's profile, redirects to /login if there isn't one
  const profile = await verifyUser();
  // Returns reservations for this host's events
  const reservations = await getReservations(profile.id);

  return <BookingsPage bookings={toBookings(reservations)} />;
}
