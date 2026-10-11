import { Calendar, Ticket, Users, PhilippinePeso } from "lucide-react";
import { SummaryBox } from "./summary-box";

export async function SummaryTotal() {
  return (
    <div className="flex flex-row gap-4 justify-evenly">
      {/* TODO: Insert acutal data as variables in title and stat in the summary box */}
      <SummaryBox title="Total Events" stat="12" color="bg-[#FFEAF5]">
        <Calendar size={50} />
      </SummaryBox>
      <SummaryBox title="Total Bookings" stat="12" color={""}>
        <Ticket size={50} />
      </SummaryBox>
      <SummaryBox title="Total Guests" stat="12" color={""}>
        <Users size={50} />
      </SummaryBox>
      <SummaryBox title="Total Revenue" stat="12" color={""}>
        <PhilippinePeso size={50} />
      </SummaryBox>
    </div>
  );
}
