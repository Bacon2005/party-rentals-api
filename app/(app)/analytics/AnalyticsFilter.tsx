// app/(app)/analytics/AnalyticsFilters.tsx
"use client";
import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AnalyticsFilters as Filters } from "./data";

interface Props {
  filters: Filters;
  options: { events: { id: string; name: string }[]; types: string[] };
}

const control =
  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700";
const label = "block text-xs text-slate-500";

export default function AnalyticsFilters({ filters, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function set(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      className={`grid gap-4 rounded-xl bg-cards border border-border-color p-5 sm:grid-cols-2 lg:grid-cols-5 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <div>
        <label className={label} htmlFor="f-event">Event</label>
        <select
          id="f-event"
          className={control}
          value={filters.eventId ?? ""}
          onChange={(e) => set("event", e.target.value)}
        >
          <option value="">All Events</option>
          {options.events.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="f-type">Reservation Type</label>
        <select
          id="f-type"
          className={control}
          value={filters.type ?? ""}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="">All Types</option>
          {options.types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label} htmlFor="f-from">From</label>
        <input
          id="f-from"
          type="date"
          className={control}
          value={filters.from}
          max={filters.to}
          onChange={(e) => e.target.value && set("from", e.target.value)}
        />
      </div>

      <div>
        <label className={label} htmlFor="f-to">To</label>
        <input
          id="f-to"
          type="date"
          className={control}
          value={filters.to}
          min={filters.from}
          onChange={(e) => e.target.value && set("to", e.target.value)}
        />
      </div>

      <div>
        <label className={label} htmlFor="f-group">Revenue by</label>
        <select
          id="f-group"
          className={control}
          value={filters.group}
          onChange={(e) => set("group", e.target.value)}
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
      </div>
    </div>
  );
}