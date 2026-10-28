import { Calendar, Plus, Search } from "lucide-react";
import type { BookingFilterState } from "./types";

interface Props {
  filters: BookingFilterState;
  onChange: (next: BookingFilterState) => void;
  events: string[];
  types: string[];
  onAdd?: () => void;
}

const field =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-500";

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${field} min-w-32.5`}
      >
        {children}
      </select>
    </label>
  );
}

export default function BookingFilters({
  filters,
  onChange,
  events,
  types,
  onAdd,
}: Props) {
  const set = (patch: Partial<BookingFilterState>) =>
    onChange({ ...filters, ...patch });

  return (
    <section className="rounded-xl p-5 bg-background border border-border-color">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage all ticket and table reservations across your
            events.
          </p>
        </div>
        {/* <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus size={16} /> Add Booking
        </button> */}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3.5">
        <div className="relative min-w-55 flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search bookings..."
            className={`${field} w-full pl-9 `}
          />
        </div>
        <Select
          label="Event"
          value={filters.event}
          onChange={(event) => set({ event })}
        >
          <option value="">All Events</option>
          {events.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </Select>
        <Select
          label="Booking Type"
          value={filters.type}
          onChange={(type) => set({ type })}
        >
          <option value="">All Types</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select
          label="Status"
          value={filters.status}
          onChange={(status) => set({ status })}
        >
          <option value="">All Statuses</option>
          <option>Confirmed</option>
          <option>Pending</option>
          <option>Cancelled</option>
        </Select>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Date Range
          <button
            type="button"
            className={`${field} flex min-w-52.5 items-center gap-2 text-left`}
          >
            <Calendar size={16} /> Oct 1, 2025 - Oct 31, 2025
          </button>
        </label>
      </div>
    </section>
  );
}
