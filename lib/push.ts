import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deviceToken } from "@/db/schema";

//Notifications pushed to the mobile device of a specific user profile.
// This function retrieves all device tokens associated with the given profile ID and
// sends a push notification with the specified title and body to each device using the Expo push notification service.
// If no device tokens are found for the profile, the function simply returns without sending any notifications.
// Any errors encountered during the push notification process are logged to the console, but they do not affect the user's
// experience or decision-making.
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
