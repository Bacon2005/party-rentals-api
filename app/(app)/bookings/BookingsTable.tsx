import type { Booking } from "./types";
import { StatusBadge, TypeBadge } from "./Badges";
import Image from "next/image";
import noProfile from "@/components/assets/images/no-profile.jpg";

interface Props {
  bookings: Booking[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const th =
  "bg-slate-100 px-2 py-2.5 text-left text-[11px] font-medium text-slate-500 first:rounded-l-lg last:rounded-r-lg";
const td = "bg-white border-border-color px-2 py-2.5 text-xs text-slate-900";

const HEADERS = [
  "Guest Name",
  "Event",
  "Type",
  "Guests",
  "Amount",
  "Booking Date",
  "Status",
];

export default function BookingsTable({
  bookings,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="overflow-x-auto ">
      <table className="bg-white w-full min-w-160 border-collapse">
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
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-300">
                      {b.profileUrl ? (
                        <Image
                          src={b.profileUrl}
                          width={96}
                          height={96}
                          alt={b.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <Image
                          src={noProfile}
                          width={96}
                          height={96}
                          alt={b.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                    </div>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
