// app/(app)/events/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { verifyUser } from "@/lib/auth";
import { getHostEvents } from "./data";
import EventsPage from "./EventsPage";

async function EventsContent() {
  await connection();
  // Gets the signed-in user's profile, redirects to /login if there isn't one
  const profile = await verifyUser();
  // Returns the events hosted by this user
  const events = await getHostEvents(profile.id);

  return <EventsPage events={events} />;
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <EventsContent />
    </Suspense>
  );
}