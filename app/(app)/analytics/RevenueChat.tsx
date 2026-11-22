// app/(app)/analytics/RevenueChart.tsx
"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function RevenueChart({
  data,
}: {
  data: { label: string; revenue: number }[];
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={64}
            tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
          />
          <Tooltip formatter={(v) => `₱${Number(v).toLocaleString()}`} />
          <Bar dataKey="revenue" name="Revenue" fill="#c4a5fa" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}