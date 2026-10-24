import { Calendar, Ticket, Users, PhilippinePeso } from "lucide-react";
import { SummaryBox } from "./summary-box";
import { connection } from "next/server";

import { verifyUser } from "@/lib/auth";
import { getTotalEvents, getTotalRevenue } from "@/lib/dashboard";
import { getBookingStats } from "@/lib/events";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export async function SummaryTotal() {
  await connection();
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
        change={0}
        iconBg="bg-[#FFEAF5]"
        iconColor="text-[#FF4DA6]"
      >
        <Calendar size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Bookings"
        stat={stats.bookings}
        change={0}
        iconBg="bg-[#EDE3FF]"
        iconColor="text-[#6C2CF5]"
      >
        <Ticket size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Guests"
        stat={stats.guests}
        change={0}
        iconBg="bg-[#E3F2FF]"
        iconColor="text-[#2F95F5]"
      >
        <Users size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Revenue"
        stat={peso.format(revenue)}
        change={0}
        iconBg="bg-[#FFF0E0]"
        iconColor="text-[#F59E0B]"
      >
        <PhilippinePeso size={26} />
      </SummaryBox>
    </div>
  );
}
