import { SummaryTotal } from "./summary-total";
import BookingsGuestsChart from "./guest-booking-chart";
import { RecentEvents } from "./recent-events";
import { Suspense } from "react";
import {
  RecentEventSkeleton,
  SummaryTotalSkeleton,
} from "@/components/Skeletons";

export default async function Dashboard() {
  return (
    <div className="w-full min-w-0 pr-6 pb-8">
      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-[#6B7AA8]">
          Overview of your events, bookings, and performance.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <Suspense fallback={<SummaryTotalSkeleton />}>
          <SummaryTotal />
        </Suspense>
        <BookingsGuestsChart />
        <Suspense fallback={<RecentEventSkeleton />}>
          <RecentEvents />
        </Suspense>
      </div>
    </div>
  );
}
