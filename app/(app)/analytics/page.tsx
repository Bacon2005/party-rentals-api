// app/(app)/analytics/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { Ticket, Users, Wallet } from "lucide-react";
import { verifyUser } from "@/lib/auth";
import { getAnalytics, getFilterOptions, parseFilters } from "./data";
import AnalyticsFilters from "./AnalyticsFilter";
import StatCard from "./StatCardz";
import RevenueChart from "./RevenueChat";
import TypeDonut from "./TypeDonuts";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function AnalyticsContent({ searchParams }: Props) {
  await connection();
  const profile = await verifyUser();
  const filters = parseFilters(await searchParams);

  const [data, options] = await Promise.all([
    getAnalytics(profile.id, filters),
    getFilterOptions(profile.id),
  ]);
  const { stats } = data;

  return (
    <div className="space-y-4">
      <AnalyticsFilters filters={filters} options={options} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={<Ticket className="h-5 w-5" />}
          label="Total Bookings"
          value={stats.bookings.toLocaleString()}
          change={stats.change.bookings}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Guests"
          value={stats.guests.toLocaleString()}
          change={stats.change.guests}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Total Revenue"
          value={`₱${stats.revenue.toLocaleString()}`}
          change={stats.change.revenue}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl bg-cards border border-border-color p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Revenue Overview
          </h2>
          <RevenueChart data={data.series} />
        </section>
        <section className="rounded-xl bg-cards border border-border-color p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Bookings by Reservation Type
          </h2>
          <TypeDonut data={data.byType} />
        </section>
      </div>
    </div>
  );
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <AnalyticsContent searchParams={searchParams} />
    </Suspense>
  );
}