import { getProfile } from "@/lib/auth";
import { getMonthlyBookingTotals } from "@/lib/dashboard";
import type { BookingsGuestsResponse } from "@/types/analytics";

export async function GET(request: Request) {
  const profile = await getProfile(request);
  if (!profile) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range = Number(new URL(request.url).searchParams.get("range") ?? "12");
  if (range !== 3 && range !== 6 && range !== 12) {
    return Response.json({ error: "Invalid date range." }, { status: 400 });
  }

  const data = await getMonthlyBookingTotals(profile.id, range);
  return Response.json({ range, data } satisfies BookingsGuestsResponse, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
