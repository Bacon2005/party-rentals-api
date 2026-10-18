import Link from "next/link";
import { ArrowRight, MoreHorizontal } from "lucide-react";

type EventStatus = "Upcoming" | "Ongoing" | "Completed";

type RecentEvent = {
  id: string;
  name: string;
  date: string;
  location: string;
  bookings: number;
  guests: number;
  revenue: number;
  status: EventStatus;
  imageUrl?: string;
};

// TODO: replace with real data from your API
const events: RecentEvent[] = [
  {
    id: "1",
    name: "Rooftop Vibes",
    date: "Oct 5, 2025",
    location: "Cebu City",
    bookings: 128,
    guests: 246,
    revenue: 45600,
    status: "Upcoming",
  },
  {
    id: "2",
    name: "Pool Party",
    date: "Oct 12, 2025",
    location: "Mandaue City",
    bookings: 96,
    guests: 180,
    revenue: 32500,
    status: "Ongoing",
  },
  {
    id: "3",
    name: "House Party",
    date: "Oct 19, 2025",
    location: "Cebu City",
    bookings: 86,
    guests: 162,
    revenue: 28900,
    status: "Upcoming",
  },
];

const statusStyles: Record<EventStatus, string> = {
  Upcoming: "bg-[#EFE7FF] text-[#6C2CF5]",
  Ongoing: "bg-[#E3F8EC] text-[#16A34A]",
  Completed: "bg-[#F1F1F4] text-[#71717A]",
};

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const th = "px-3 py-3 text-left text-xs font-medium text-[#6B7AA8]";
const td = "px-3 py-3 text-sm text-foreground";

export function RecentEvents() {
  return (
    <section className="w-full min-w-0 rounded-xl border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Recent Events</h2>
        <Link
          href="/events"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-205 border-collapse">
          <thead>
            <tr className="bg-[#F6F7FB]">
              <th className={`${th} rounded-l-lg`}>Event</th>
              <th className={th}>Date</th>
              <th className={th}>Location</th>
              <th className={`${th} text-center`}>Bookings</th>
              <th className={`${th} text-center`}>Guests</th>
              <th className={th}>Revenue</th>
              <th className={`${th} text-center`}>Status</th>
              <th className={`${th} rounded-r-lg text-center`}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {events.map((event) => (
              <tr
                key={event.id}
                className="border-b border-border last:border-0"
              >
                <td className={td}>
                  <div className="flex items-center gap-3">
                    {event.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-md bg-[#C4C4C4]" />
                    )}
                    <span className="font-semibold">{event.name}</span>
                  </div>
                </td>
                <td className={`${td} text-[#6B7AA8]`}>{event.date}</td>
                <td className={`${td} text-[#6B7AA8]`}>{event.location}</td>
                <td className={`${td} text-center`}>{event.bookings}</td>
                <td className={`${td} text-center`}>{event.guests}</td>
                <td className={td}>{peso.format(event.revenue)}</td>
                <td className={`${td} text-center`}>
                  <span
                    className={`inline-block min-w-21 rounded-md px-3 py-2 text-xs font-medium ${statusStyles[event.status]}`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className={td}>
                  <div className="flex items-center justify-center gap-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="min-w-15 rounded-lg bg-[#F1EAFE] px-5 py-2 text-center text-xs font-medium text-primary hover:bg-[#E6DAFD]"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      aria-label={`More actions for ${event.name}`}
                      className="rounded-md border border-border p-1 text-foreground hover:bg-[#F6F7FB]"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
