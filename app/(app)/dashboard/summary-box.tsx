import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type SummaryBoxProps = {
  title: string;
  stat: number | string;
  /** Fractional change from the previous month, or null for a zero baseline. */
  change: number | null;
  /** Tailwind classes for the icon tile background, e.g. "bg-[#FFEAF5]" */
  iconBg: string;
  /** Tailwind classes for the icon color, e.g. "text-[#FF4DA6]" */
  iconColor: string;
  children: ReactNode;
};

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumFractionDigits: 1,
});

export function SummaryBox({
  title,
  stat,
  change,
  iconBg,
  iconColor,
  children,
}: SummaryBoxProps) {
  const direction = Math.sign(change ?? 0);
  const TrendIcon = direction > 0 ? ArrowUpRight : ArrowDownRight;
  const trendColor =
    direction > 0
      ? "bg-[#E3F8EC] text-[#16A34A]"
      : direction < 0
        ? "bg-[#FDE8E8] text-[#DC2626]"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-border-color bg-cards p-4">
      <div
        className={`flex h-15 w-15 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
      >
        {children}
      </div>

      <div className="min-w-0">
        <h2 className="text-sm text-[#6B7AA8]">{title}</h2>
        <p className="truncate text-3xl font-bold leading-tight text-foreground">
          {stat}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${trendColor}`}
          >
            {direction !== 0 && <TrendIcon size={12} aria-hidden="true" />}
            {change === null ? "New" : percent.format(change)}
          </span>
          <span className="text-[#6B7AA8]">
            {change === null ? "this month" : "vs. previous month"}
          </span>
        </div>
      </div>
    </div>
  );
}
