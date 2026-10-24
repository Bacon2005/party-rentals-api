// app/dev/skeletons/page.tsx
import { notFound } from "next/navigation";
import {
  RecentEventSkeleton,
  TopBarSkeleton,
  SummaryTotalSkeleton,
} from "@/components/Skeletons";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound(); // dev only

  return (
    <div className="space-y-12 p-8">
      <section>
        <h2 className="text-sm text-neutral-500">RecentEventSkeleton</h2>
        <RecentEventSkeleton />
      </section>
      <section>
        <h2 className="text-sm text-neutral-500">TopBarSkeleton</h2>
        <TopBarSkeleton />
      </section>
      <section>
        <h2 className="text-sm text-neutral-500">SummaryTotalSkeleton</h2>
        <SummaryTotalSkeleton />
      </section>
    </div>
  );
}
