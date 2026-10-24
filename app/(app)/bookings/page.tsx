"use client";
import { useMemo, useState } from "react";
import type { Booking, BookingFilterState } from "./types";
import { MOCK_BOOKINGS } from "./data";
import BookingFilters from "./BookingsFilters";
import BookingsTable from "./BookingsTable";
import BookingDetails from "./BookingDetails";

interface Props {
  bookings?: Booking[];
}

export default function BookingsPage({ bookings = MOCK_BOOKINGS }: Props) {
  const [filters, setFilters] = useState<BookingFilterState>({
    search: "",
    event: "",
    type: "",
    status: "",
  });
  const [selectedId, setSelectedId] = useState<string | undefined>(
    bookings[0]?.id,
  );

  const events = useMemo(
    () => [...new Set(bookings.map((b) => b.event))],
    [bookings],
  );
  const types = useMemo(
    () => [...new Set(bookings.map((b) => b.type))],
    [bookings],
  );

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();
    return bookings.filter(
      (b) =>
        (!q ||
          `${b.name} ${b.email} ${b.event} ${b.id}`
            .toLowerCase()
            .includes(q)) &&
        (!filters.event || b.event === filters.event) &&
        (!filters.type || b.type === filters.type) &&
        (!filters.status || b.status === filters.status),
    );
  }, [bookings, filters]);

  const selected = bookings.find((b) => b.id === selectedId);

  return (
    <div className="space-y-4">
      <BookingFilters
        filters={filters}
        onChange={setFilters}
        events={events}
        types={types}
      />

      <div
        className={`grid items-start gap-4 ${selected ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}
      >
        <section className="rounded-xl bg-white p-5 dark:bg-slate-900">
          <BookingsTable
            bookings={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filtered.length ? 1 : 0} of 1 pages</span>
            <div className="flex gap-1.5">
              <button className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700">
                ‹
              </button>
              <button className="h-7 w-7 rounded-md bg-violet-600 text-white">
                1
              </button>
              <button className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-700">
                ›
              </button>
            </div>
          </div>
        </section>

        {selected && (
          <BookingDetails
            booking={selected}
            onClose={() => setSelectedId(undefined)}
          />
        )}
      </div>
    </div>
  );
}
