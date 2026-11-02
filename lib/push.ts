import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deviceToken } from "@/db/schema";

export async function sendPushToProfile(
  profileId: string,
  title: string,
  body: string,
) {
  const rows = await db
    .select({ token: deviceToken.token })
    .from(deviceToken)
    .where(eq(deviceToken.profileId, profileId));

  if (rows.length === 0) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        rows.map((r) => ({ to: r.token, title, body, sound: "default" })),
      ),
    });
  } catch (error) {
    // A failed push should never undo the host's decision
    console.error("Push failed:", error);
  }
}
