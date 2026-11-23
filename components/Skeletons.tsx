import { cardClass } from "@/app/(app)/settings/ui";

const PULSE = "animate-pulse bg-neutral-400";
const BAR = `${PULSE} rounded`;
const array = [0, 1];

export function RecentEventSkeleton() {
  return (
    <div className="mt-8 space-y-4" aria-hidden="true">
      <div className="flex flex-row justify-between">
        <div className={`h-8 w-30 ${BAR}`} />
        <div className={`h-8 w-30 ${BAR}`} />
      </div>

      <div className="flex flex-row gap-5">
        {[0, 1, 2].map((col) => (
          <div key={col} className="flex-1 space-y-2">
            {array.map((i) => (
              <div key={i} className={`h-8 w-full ${BAR}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopBarSkeleton() {
  return (
    <div className="flex justify-end w-full">
      <div className={`h-8 w-50 ${BAR}`}></div>
    </div>
  );
}

export function SummaryTotalSkeleton() {
  return (
    <div className="flex flex-row justify-between">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="flex w-full gap-3">
          <div className={`h-20 w-20 ${BAR}`} />
          <div className="flex flex-col gap-3">
            <div className={`h-5 w-20 ${BAR}`} />
            <div className={`h-5 w-10 ${BAR}`} />
            <div className={`h-5 w-48 ${BAR}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Settings Skeleton

function FieldSkeleton() {
  return (
    <div className="space-y-1">
      <div className={`h-3 w-24 ${BAR}`} />
      <div className={`h-10 w-full ${BAR}`} />
    </div>
  );
}

function CardHeaderSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <div className="space-y-2">
      <div className={`h-5 ${titleWidth} ${BAR}`} />
      <div className={`h-4 w-64 max-w-full ${BAR}`} />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className={cardClass}>
      <CardHeaderSkeleton titleWidth="w-40" />
      <div className="mt-4 flex flex-col gap-5 sm:flex-row">
        <div
          className={`h-20 w-20 shrink-0 rounded-full sm:mt-5 sm:h-20.5 sm:w-20.5 ${PULSE}`}
        />
        <div className="flex-1 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <FieldSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <div className={`h-10 w-32 ${BAR}`} />
      </div>
    </div>
  );
}

export function ChangePasswordSkeleton() {
  return (
    <div className={cardClass}>
      <CardHeaderSkeleton titleWidth="w-36" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <div className={`h-10 w-36 ${BAR}`} />
      </div>
    </div>
  );
}

export function DangerZoneSkeleton() {
  return (
    <div className={cardClass}>
      <CardHeaderSkeleton titleWidth="w-28" />
      <div className={`mt-4 h-10 w-full ${BAR}`} />
    </div>
  );
}

export function SettingsContentSkeleton() {
  return (
    <div
      className="mt-6 grid items-start gap-6 lg:grid-cols-2"
      aria-hidden="true"
    >
      <ProfileSkeleton />
      <div className="space-y-6">
        <ChangePasswordSkeleton />
        <DangerZoneSkeleton />
      </div>
    </div>
  );
}

/* ----------------------------- Bookings page ----------------------------- */

const COLUMNS = [
  { key: "guest", label: "w-20", cell: "flex-[2.2]" },
  { key: "event", label: "w-12", cell: "flex-[2.2]" },
  { key: "type", label: "w-10", cell: "flex-[1.4]" },
  { key: "guests", label: "w-12", cell: "flex-[0.8]" },
  { key: "amount", label: "w-14", cell: "flex-[0.9]" },
  { key: "date", label: "w-20", cell: "flex-[1.4]" },
  { key: "status", label: "w-12", cell: "flex-[1.3]" },
  { key: "actions", label: "w-12", cell: "w-10 shrink-0" },
];

function FilterSkeleton({ width }: { width: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`${BAR} h-3 w-14`} />
      <div className={`${BAR} h-10 rounded-lg ${width}`} />
    </div>
  );
}

function BookingRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-2 py-3">
      {/* Guest */}
      <div className={`${COLUMNS[0].cell} flex items-center gap-3`}>
        <div className={`${PULSE} h-6 w-6 shrink-0 rounded-full`} />
        <div className="flex flex-col gap-1.5">
          <div className={`${BAR} h-3.5 w-20`} />
          <div className={`${BAR} h-2.5 w-32`} />
        </div>
      </div>
      {/* Event */}
      <div className={COLUMNS[1].cell}>
        <div className={`${BAR} h-3.5 w-36`} />
      </div>
      {/* Type badge */}
      <div className={COLUMNS[2].cell}>
        <div className={`${BAR} h-6 w-16 rounded-md`} />
      </div>
      {/* Guests */}
      <div className={COLUMNS[3].cell}>
        <div className={`${BAR} h-3.5 w-3`} />
      </div>
      {/* Amount */}
      <div className={COLUMNS[4].cell}>
        <div className={`${BAR} h-3.5 w-10`} />
      </div>
      {/* Booking date */}
      <div className={`${COLUMNS[5].cell} flex flex-col gap-1.5`}>
        <div className={`${BAR} h-3.5 w-20`} />
        <div className={`${BAR} h-2.5 w-12`} />
      </div>
      {/* Status badge */}
      <div className={COLUMNS[6].cell}>
        <div className={`${BAR} h-6 w-20 rounded-md`} />
      </div>
      {/* Actions */}
      <div className={COLUMNS[7].cell}>
        <div className={`${BAR} h-7 w-7 rounded-md`} />
      </div>
    </div>
  );
}

function DetailRowSkeleton({ valueWidth }: { valueWidth: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`${BAR} h-4 w-4`} />
        <div className={`${BAR} h-3 w-20`} />
      </div>
      <div className={`${BAR} h-3 ${valueWidth}`} />
    </div>
  );
}

function BookingDetailsSkeleton() {
  return (
    <aside className="w-full shrink-0 rounded-2xl bg-white p-5 lg:w-70">
      {/* Title + close */}
      <div className="flex items-center justify-between">
        <div className={`${BAR} h-5 w-32`} />
        <div className={`${BAR} h-4 w-4`} />
      </div>

      {/* Guest */}
      <div className="mt-5 flex items-center gap-3 border-b border-neutral-100 pb-5">
        <div className={`${PULSE} h-10 w-10 shrink-0 rounded-full`} />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`${BAR} h-4 w-16`} />
            <div className={`${BAR} h-5 w-16 rounded-md`} />
          </div>
          <div className={`${BAR} h-3 w-36`} />
        </div>
      </div>

      {/* Booking information */}
      <div className="mt-5 flex flex-col gap-4">
        <div className={`${BAR} h-3.5 w-28`} />
        <DetailRowSkeleton valueWidth="w-24" />
        <DetailRowSkeleton valueWidth="w-20" />
        <DetailRowSkeleton valueWidth="w-4" />
        <DetailRowSkeleton valueWidth="w-8" />
        <DetailRowSkeleton valueWidth="w-28" />
        <DetailRowSkeleton valueWidth="w-4" />
        <div className={`${BAR} h-10 w-full rounded-lg`} />
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-3 border-t border-neutral-100 pt-5">
        <div className={`${BAR} h-3.5 w-14`} />
        <div className={`${BAR} h-9 w-full rounded-lg`} />
        <div className={`${BAR} h-9 w-full rounded-lg`} />
        <div className={`${BAR} h-9 w-full rounded-lg`} />
      </div>
    </aside>
  );
}

type BookingsSkeletonProps = {
  /** Number of placeholder table rows. */
  rows?: number;
  /** Show the right-hand "Booking Details" panel placeholder. */
  showDetails?: boolean;
};

export function BookingsSkeleton({
  rows = 3,
  showDetails = true,
}: BookingsSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-5 p-4"
      role="status"
      aria-busy="true"
      aria-label="Loading bookings"
    >
      {/* Header + filters */}
      <section className="rounded-2xl bg-white p-6">
        <div className={`${BAR} h-8 w-40`} />
        <div className={`${BAR} mt-3 h-3.5 w-72`} />

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-60">
            <div className={`${BAR} h-10 w-full rounded-lg`} />
          </div>
          <FilterSkeleton width="w-44" />
          <FilterSkeleton width="w-36" />
          <FilterSkeleton width="w-36" />
          <FilterSkeleton width="w-52" />
        </div>
      </section>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Table */}
        <section className="min-w-0 flex-1 rounded-2xl bg-white p-5">
          {/* Table header */}
          <div className="flex items-center gap-4 rounded-lg bg-neutral-100 px-2 py-3">
            {COLUMNS.map((col) => (
              <div key={col.key} className={col.cell}>
                <div className={`${BAR} h-3 ${col.label}`} />
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="mt-1 flex flex-col">
            {Array.from({ length: rows }).map((_, i) => (
              <BookingRowSkeleton key={i} />
            ))}
          </div>

          {/* Footer: count + pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className={`${BAR} h-3 w-36`} />
            <div className="flex items-center gap-2">
              <div className={`${BAR} h-7 w-7 rounded-md`} />
              <div className={`${BAR} h-7 w-7 rounded-md`} />
              <div className={`${BAR} h-7 w-7 rounded-md`} />
            </div>
          </div>
        </section>

        {showDetails && <BookingDetailsSkeleton />}
      </div>

      <span className="sr-only">Loading bookings…</span>
    </div>
  );
}

/* -------------------------- Verification status -------------------------- */

export function VerificationStatusSkeleton() {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-busy="true"
      aria-label="Loading verification status"
    >
      {/* Tier: basic · ID status: failed */}
      <div className={`${BAR} h-4 w-56`} />

      {/* Description (2 lines) */}
      <div className="space-y-2">
        <div className={`${BAR} h-4 w-full`} />
        <div className={`${BAR} h-4 w-3/4`} />
      </div>

      {/* View ID verification link */}
      <div className={`${BAR} h-4 w-36`} />

      <span className="sr-only">Loading verification status…</span>
    </div>
  );
}