// EventFilters.tsx
"use client";
import type { EventFilterState, EventStatus } from "./types";

const STATUSES: EventStatus[] = ["Upcoming", "Ongoing", "Finished"];

interface Props {
  filters: EventFilterState;
  onChange: (filters: EventFilterState) => void;
}

export default function EventFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 rounded-xl bg-cards border border-border-color p-4">
      <input
        type="search"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search events..."
        className="h-9 min-w-48 flex-1 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700"
      />
      <select
        value={filters.status}
        onChange={(e) =>
          onChange({ ...filters, status: e.target.value as EventStatus | "" })
        }
        className="h-9 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700"
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
