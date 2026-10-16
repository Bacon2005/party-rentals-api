import { Calendar, Ticket, Users, PhilippinePeso } from "lucide-react";
import { SummaryBox } from "./summary-box";

// TODO: replace with real data from your API
const summary = {
  events: { total: 12, change: 20 },
  bookings: { total: 548, change: 32 },
  guests: { total: 1024, change: 28 },
  revenue: { total: 158420, change: 35 },
};

const number = new Intl.NumberFormat("en-PH");

export async function SummaryTotal() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryBox
        title="Total Events"
        stat={number.format(summary.events.total)}
        change={summary.events.change}
        iconBg="bg-[#FFEAF5]"
        iconColor="text-[#FF4DA6]"
      >
        <Calendar size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Bookings"
        stat={number.format(summary.bookings.total)}
        change={summary.bookings.change}
        iconBg="bg-[#EDE3FF]"
        iconColor="text-[#6C2CF5]"
      >
        <Ticket size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Guests"
        stat={number.format(summary.guests.total)}
        change={summary.guests.change}
        iconBg="bg-[#E3F2FF]"
        iconColor="text-[#2F95F5]"
      >
        <Users size={26} />
      </SummaryBox>

      <SummaryBox
        title="Total Revenue"
        stat={`₱${number.format(summary.revenue.total)}`}
        change={summary.revenue.change}
        iconBg="bg-[#FFF0E0]"
        iconColor="text-[#F59E0B]"
      >
        <PhilippinePeso size={26} />
      </SummaryBox>
    </div>
  );
}
