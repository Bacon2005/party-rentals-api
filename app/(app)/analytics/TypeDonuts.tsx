// app/(app)/analytics/TypeDonut.tsx
"use client";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const COLORS = ["#5b1fe0", "#8b4cf6", "#a98bf5", "#d3c2fb", "#e9defd"];

export default function TypeDonut({
  data,
}: {
  data: { type: string; count: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">
        No bookings in this range.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              innerRadius="62%"
              outerRadius="100%"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">Total Bookings</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.type} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 truncate text-slate-600">{d.type}</span>
            <span className="font-semibold text-slate-900">
              {d.count} ({Math.round((d.count / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
