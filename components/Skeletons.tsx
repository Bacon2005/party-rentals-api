const BAR = "animate-pulse rounded bg-neutral-400";
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
