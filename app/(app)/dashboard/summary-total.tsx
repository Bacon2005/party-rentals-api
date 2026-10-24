import { Calendar, Ticket, Users, PhilippinePeso } from "lucide-react";
import { SummaryBox } from "./summary-box";

// TODO: replace with real data from your API
const summary = {
  events: { total: 12, change: 20 },
  bookings: { total: 548, change: 32 },
  guests: { total: 1024, change: 28 },
  revenue: { total: 158420, change: 35 },
};

import { verifyUser } from "@/lib/auth";
import { getTotalEvents, getTotalRevenue } from "@/lib/dashboard";
import { getBookingStats } from "@/lib/events";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export async function SummaryTotal() {
  const profile = await verifyUser();
  // const totalEvents = await getTotalEvents(profile.id);
  // const totalRevenue = await getTotalRevenue(profile.id);

  const [events, revenue, stats] = await Promise.all([
    getTotalEvents(profile.id),
    getTotalRevenue(profile.id),
    getBookingStats(profile.id),
  ]);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryBox
        title="Total Events"
        stat={events}
        change={summary.events.change}
        iconBg="bg-[#FFEAF5]"
        iconColor="text-[#FF4DA6]"
      >
        <Calendar size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Bookings"
        stat={stats.bookings}
        change={summary.bookings.change}
        iconBg="bg-[#EDE3FF]"
        iconColor="text-[#6C2CF5]"
      >
        <Ticket size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Guests"
        stat={stats.guests}
        change={summary.guests.change}
        iconBg="bg-[#E3F2FF]"
        iconColor="text-[#2F95F5]"
      >
        <Users size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Revenue"
        stat={peso.format(revenue)}
        change={summary.revenue.change}
        iconBg="bg-[#FFF0E0]"
        iconColor="text-[#F59E0B]"
      >
        <PhilippinePeso size={26} />
      </SummaryBox>
    </div>
  );
}
