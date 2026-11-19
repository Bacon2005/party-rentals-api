"use client";
import { useMemo, useState } from "react";
import type { Event, EventFilterState } from "./types";
import EventFilters from "./EventFilters";
import EventsTable from "./EventTable";
import EventDetails from "./EventDetails";

export default function EventsPage({ events }: { events: Event[] }) {
  const [filters, setFilters] = useState<EventFilterState>({
    search: "",
    status: "",
  });
  const [selectedId, setSelectedId] = useState<string | undefined>(
    events[0]?.id,
  );

  const filtered = useMemo(() => {
    // Filter events using the search text and the selected status.
    // React recalculates this list when events or filters change.
    const q = filters.search.toLowerCase();
    return events.filter(
      (e) =>
        (!q || `${e.name} ${e.location} ${e.id}`.toLowerCase().includes(q)) &&
        (!filters.status || e.status === filters.status),
    );
  }, [events, filters]);

  const selected = filtered.find((e) => e.id === selectedId);

  return (
    <div className="space-y-4">
      <EventFilters filters={filters} onChange={setFilters} />

      <div
        className={`grid items-start gap-4 ${selected ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}
      >
        <section className="rounded-xl bg-cards border border-border-color p-5">
          <EventsTable
            events={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="mt-4 text-xs text-slate-500">
            Showing {filtered.length} of {events.length} events
          </div>
        </section>

        {selected && (
          <EventDetails
            event={selected}
            onClose={() => setSelectedId(undefined)}
          />
        )}
      </div>
    </div>
  );
}