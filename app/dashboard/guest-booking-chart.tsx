"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { getBookingsGuestsTrend } from "@/app/api/analytics";
import type {
  AnalyticsRange,
  BookingsGuestsDataPoint,
} from "@/types/analytics";

export default function BookingsGuestsChart() {
  const [range, setRange] = useState<AnalyticsRange>(12);
  const [data, setData] = useState<BookingsGuestsDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getBookingsGuestsTrend(range);

        if (!cancelled) {
          setData(response.data);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load bookings and guests data.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <section className="w-full min-w-0 rounded-xl border border-border bg-background p-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">
          Bookings &amp; Guests Trend
        </h2>

        <select
          value={range}
          onChange={(event) =>
            setRange(Number(event.target.value) as AnalyticsRange)
          }
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
          aria-label="Select chart date range"
        >
          <option value={12}>Last 12 Months</option>
          <option value={6}>Last 6 Months</option>
          <option value={3}>Last 3 Months</option>
        </select>
      </div>

      {/* Loading, error, empty, or chart */}
      <div className="h-[280px] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-foreground/60">Loading analytics...</p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex h-full flex-col items-center justify-center gap-3"
          >
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => setRange(range)}
              className="text-sm font-medium text-primary underline"
            >
              Retry
            </button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-foreground/60">
              No analytics data available for this period.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
              barGap={6}
            >
              <CartesianGrid stroke="#E8EAF3" vertical horizontal />

              <XAxis
                dataKey="month"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
              />

              <YAxis
                allowDecimals={false}
                domain={[
                  0,
                  (max: number) => Math.max(50, Math.ceil(max / 50) * 50),
                ]}
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                cursor={{ fill: "rgba(108, 44, 245, 0.05)" }}
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                labelStyle={{
                  color: "var(--foreground)",
                  fontWeight: 600,
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                iconType="circle"
                iconSize={9}
                wrapperStyle={{ fontSize: "12px" }}
              />

              <Bar
                dataKey="bookings"
                name="Bookings"
                fill="#6C2CF5"
                radius={[12, 12, 0, 0]}
                maxBarSize={26}
              />

              <Bar
                dataKey="guests"
                name="Guests"
                fill="#FF9ADD"
                radius={[12, 12, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
