import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type SummaryBoxProps = {
  title: string;
  stat: number | string;
  /** Percentage change vs. previous period. Positive = up, negative = down. */
  change: number;
  /** Tailwind classes for the icon tile background, e.g. "bg-[#FFEAF5]" */
  iconBg: string;
  /** Tailwind classes for the icon color, e.g. "text-[#FF4DA6]" */
  iconColor: string;
  children: ReactNode;
};

export function SummaryBox({
  title,
  stat,
  change,
  iconBg,
  iconColor,
  children,
}: SummaryBoxProps) {
  const isUp = change >= 0;
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-border-color bg-background p-4">
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
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${
              isUp
                ? "bg-[#E3F8EC] text-[#16A34A]"
                : "bg-[#FDE8E8] text-[#DC2626]"
            }`}
          >
            <TrendIcon size={12} />
            {isUp ? "+" : ""}
            {change}%
          </span>
          <span className="text-[#6B7AA8]">vs. previous month</span>
        </div>
      </div>
    </div>
  );
}
