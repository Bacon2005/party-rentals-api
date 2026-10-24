import "server-only";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { event } from "@/db/schema";

export async function getTotalEvents(hostId: string) {
  const [result] = await db
    .select({ total: count() })
    .from(event)
    .where(eq(event.hostId, hostId));

  return result.total;
}

export async function getTotalRevenue(hostId: string) {
  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${event.totalEarned}), 0)`.mapWith(
        Number,
      ),
    })
    .from(event)
    .where(eq(event.hostId, hostId));

  return result.total;
}
