import { MoreHorizontal } from "lucide-react";
import type { Booking } from "./types";
import { StatusBadge, TypeBadge } from "./Badges";

interface Props {
  bookings: Booking[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const th =
  "bg-slate-100 px-2 py-2.5 text-left text-[11px] font-medium text-slate-500 first:rounded-l-lg last:rounded-r-lg";
const td =
  "bg-background-color border-border-color border-slate-100 px-2 py-2.5 text-xs text-slate-900";

const HEADERS = [
  "Guest Name",
  "Event",
  "Type",
  "Guests",
  "Amount",
  "Booking Date",
  "Status",
  "Actions",
];

export default function BookingsTable({
  bookings,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="overflow-x-auto ">
      <table className="w-full min-w-160 border-collapse">
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
          {bookings.length === 0 ? (
            <tr>
              <td
                colSpan={HEADERS.length}
                className="px-4 py-10 text-center text-sm text-slate-500"
              >
                No reservations found.
              </td>
            </tr>
          ) : (
            bookings.map((b) => (
              <tr
                key={b.id}
                onClick={() => onSelect(b.id)}
                className={`cursor-pointer bg-background-color hover:bg-slate-200 ${
                  b.id === selectedId ? "bg-slate-50 " : ""
                }`}
              >
                <td className={td}>
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-slate-300" />
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {b.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className={td}>
                  <div className="font-medium">{b.event}</div>
                </td>
                <td className={td}>
                  <TypeBadge kind={b.kind} label={b.type} />
                </td>
                <td className={td}>{b.guests}</td>
                <td className={td}>₱{b.amount.toLocaleString()}</td>
                <td className={td}>
                  <div>{b.bookingDate}</div>
                  <div className="text-[10px] text-slate-500">
                    {b.bookingTime}
                  </div>
                </td>
                <td className={td}>
                  <StatusBadge status={b.status} />
                </td>
                <td className={td} onClick={(e) => e.stopPropagation()}>
                  <button
                    aria-label="More actions"
                    className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 "
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
