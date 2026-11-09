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

export function BookingsSkeleton() {
  return <div className={`h-8 w-50 ${BAR}`}></div>;
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
