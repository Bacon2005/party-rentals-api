// app/(app)/analytics/StatCard.tsx
import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  change: number | null;
}

export default function StatCard({ icon, label, value, change }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-cards border border-border-color p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
        <div
          className={`text-xs font-medium ${
            change === null
              ? "text-slate-400"
              : change >= 0
                ? "text-green-600"
                : "text-red-600"
          }`}
        >
          {change === null
            ? "No previous data"
            : `${change >= 0 ? "↑" : "↓"} ${Math.abs(change)}%`}
          {change !== null && (
            <span className="font-normal text-slate-500"> vs. previous period</span>
          )}
        </div>
      </div>
    </div>
  );
}