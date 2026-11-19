// EventsTable.tsx
import { CalendarDays, Clock, MapPin, MoreHorizontal } from "lucide-react";
import type { Event } from "./types";
import { EventStatusBadge } from "./Badges";
import EventThumb from "./EventThumb";
import { formatDate, formatTimeRange } from "./format";

interface Props {
  events: Event[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const th =
  "bg-slate-100 px-2 py-2.5 text-left text-[11px] font-medium text-slate-500 first:rounded-l-lg last:rounded-r-lg";
const td = "bg-white border-border-color px-2 py-2.5 text-xs text-slate-900";

const HEADERS = [
  "Event",
  "Date & Time",
  "Location",
  "Bookings",
  "Guests",
  "Revenue",
  "Status",
  "Actions",
];

export default function EventsTable({ events, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="bg-white w-full min-w-200 border-collapse">
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td
                colSpan={HEADERS.length}
                className="px-4 py-10 text-center text-sm text-slate-500"
              >
                No events found.
              </td>
            </tr>
          ) : (
            events.map((e) => (
              <tr
                key={e.id}
                onClick={() => onSelect(e.id)}
                className={`cursor-pointer hover:bg-slate-200 ${
                  e.id === selectedId ? "bg-slate-50" : ""
                }`}
              >
                <td className={td}>
                  <div className="flex items-center gap-2.5">
                    <EventThumb
                      src={e.imageUrl}
                      alt={e.name}
                      className="h-12 w-12 shrink-0 rounded-lg"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{e.name}</div>
                      <div className="line-clamp-2 max-w-40 text-[11px] text-slate-500">
                        {e.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(e.startTime)}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTimeRange(e.startTime, e.endTime)}
                  </div>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {e.location}
                  </div>
                </td>
                <td className={td}>{e.bookings}</td>
                <td className={td}>{e.guests}</td>
                <td className={td}>₱{e.revenue.toLocaleString()}</td>
                <td className={td}>
                  <EventStatusBadge status={e.status} />
                </td>
                <td className={td}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelect(e.id)}
                      className="rounded-md bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-200"
                    >
                      View
                    </button>
                    <button
                      onClick={(ev) => ev.stopPropagation()}
                      aria-label="More actions"
                      className="rounded-md border border-slate-200 p-1.5 dark:border-slate-700"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
