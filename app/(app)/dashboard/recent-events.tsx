import Link from "next/link";
import { ArrowRight, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { connection } from "next/server";

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

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});

function getStatus(start: Date, end: Date, now: Date): EventStatus {
  if (now < start) return "Upcoming";
  if (now > end) return "Completed";
  return "Ongoing";
}

async function getRecentEvents(): Promise<RecentEvent[]> {
  const supabase = await createClient(); // reads cookies, so this is request-time
  const { data, error } = await supabase.rpc("get_recent_events", {
    p_limit: 5,
  });
  if (error) throw new Error(error.message);

  const now = new Date(); // safe: after the cookies() access above

  return (data ?? []).map(
    (row: {
      start_time: string | number | Date;
      end_time: string | number | Date;
      event_id: any;
      event_name: any;
      location: any;
      bookings: any;
      guests: any;
      total_earned: any;
      image_url: any;
    }) => {
      const start = new Date(row.start_time);
      const end = new Date(row.end_time);
      return {
        id: row.event_id,
        name: row.event_name,
        date: dateFmt.format(start),
        location: row.location ?? "TBA",
        bookings: Number(row.bookings),
        guests: Number(row.guests),
        revenue: row.total_earned,
        status: getStatus(start, end, now),
        imageUrl: row.image_url ?? undefined,
      };
    },
  );
}

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

export async function RecentEvents() {
  await connection();
  const events = await getRecentEvents();
  return (
    <section className="w-full min-w-0 rounded-xl border border-border-color bg-background p-5">
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
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className={`${td} py-8 text-center text-[#6B7AA8]`}
                >
                  No events yet.
                </td>
              </tr>
            )}
            {events.map((event) => (
              <tr
                key={event.id}
                className="border-b border-border-color last:border-0"
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
