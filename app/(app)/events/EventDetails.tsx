// EventDetails.tsx

"use client";
import { useState } from "react";
import EditEventModal from "./EditEventModal";
import { CalendarDays, Clock, MapPin, SquarePen, X } from "lucide-react";
import type { Event } from "./types";
import { EventStatusBadge } from "./Badges";
import EventThumb from "./EventThumb";
import { formatDate, formatTimeRange } from "./format";

interface Props {
  event: Event;
  onClose: () => void;
}
export default function EventDetails({ event, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const canEdit = event.status === "Upcoming";
  return (
    <aside className="rounded-xl bg-cards border border-border-color p-5">
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-bold text-slate-900">Event Details</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="text-violet-600 hover:text-violet-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex gap-3">
        <EventThumb
          src={event.imageUrl}
          alt={event.name}
          className="h-14 w-14 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{event.name}</h3>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{event.description}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        <li className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4" />
          {formatDate(event.startTime)}
        </li>
        <li className="flex items-center gap-2.5">
          <Clock className="h-4 w-4" />
          {formatTimeRange(event.startTime, event.endTime)}
        </li>
        <li className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4" />
          {event.location}
        </li>
      </ul>

      <hr className="my-4 border-border-color" />

      <h4 className="text-sm font-semibold text-slate-900">Event Statistics</h4>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ["Bookings", event.bookings],
          ["Guests", event.guests],
          ["Revenue", `₱${event.revenue.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-slate-100 p-2">
            <dd className="text-sm font-semibold text-slate-900">{value}</dd>
            <dt className="text-[10px] text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>
      <h4 className="mt-5 text-sm font-semibold text-slate-900">
        Event Actions
      </h4>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={!canEdit}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        <SquarePen className="h-4 w-4" />
        Edit Event
      </button>
      {!canEdit && (
        <p className="mt-1.5 text-center text-[11px] text-slate-500">
          Only upcoming events can be edited.
        </p>
      )}

      {editing && canEdit && (
        <EditEventModal
          key={event.id}
          event={event}
          onClose={() => setEditing(false)}
        />
      )}
    </aside>
  );
}
