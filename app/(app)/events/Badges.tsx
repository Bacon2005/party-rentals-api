// Badges.tsx (add to your existing file)
import type { EventStatus } from "./types";

const EVENT_STATUS_STYLES: Record<EventStatus, string> = {
  Upcoming: "bg-violet-100 text-violet-600",
  Ongoing: "bg-green-100 text-green-600",
  Finished: "bg-slate-100 text-slate-500",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-block rounded-md px-2.5 py-1 text-xs font-medium ${EVENT_STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}