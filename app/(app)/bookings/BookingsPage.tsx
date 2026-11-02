"use client";
import { useMemo, useState, useTransition } from "react";
import { decideReservation } from "./actions";
import type { Booking, BookingFilterState } from "./types";
import BookingFilters from "./BookingsFilters";
import BookingsTable from "./BookingsTable";
import BookingDetails from "./BookingDetails";

export default function BookingsPage({ bookings }: { bookings: Booking[] }) {
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
    // Build a list of unique event names. React reuses this list
    // until the bookings array changes.
    () => [...new Set(bookings.map((b) => b.event))],
    [bookings],
  );
  const types = useMemo(
    // Build a list of unique booking types. React reuses this list
    // until the bookings array changes.
    () => [...new Set(bookings.map((b) => b.type))],
    [bookings],
  );

  const filtered = useMemo(() => {
    // Filter bookings using the current search text and selected filters.
    // React recalculates this list when bookings or filters change.
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

  const selected = filtered.find((b) => b.id === selectedId);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(b: Booking, decision: "Confirmed" | "Denied") {
    const verb = decision === "Confirmed" ? "confirm" : "deny";
    if (
      !window.confirm(
        `Are you sure you want to ${verb} this reservation? This can't be undone.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await decideReservation(b.reservationId, decision);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

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
        <section className="rounded-xl bg-background-color border border-border-color p-5">
          <BookingsTable
            bookings={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filtered.length} of {bookings.length} bookings
            </span>
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
          <div className="space-y-2">
            <BookingDetails
              booking={selected}
              busy={isPending}
              onClose={() => setSelectedId(undefined)}
              onSendConfirmation={(b) => decide(b, "Confirmed")}
              onCancel={(b) => decide(b, "Denied")}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
