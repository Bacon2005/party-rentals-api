import { db } from "@/db";
import { deviceToken } from "@/db/schema";
import { getProfile } from "@/lib/auth"; // your auth.ts

export async function POST(request: Request) {
  const profile = await getProfile(request);
  if (!profile) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await request.json();
  if (
    typeof token !== "string" ||
    !/^Expo(nent)?PushToken\[.+\]$/.test(token)
  ) {
    return Response.json({ error: "Invalid token" }, { status: 400 });
  }

  // If this phone was used by another account before, move it to this one
  await db
    .insert(deviceToken)
    .values({ profileId: profile.id, token })
    .onConflictDoUpdate({
      target: deviceToken.token,
      set: { profileId: profile.id },
    });

  return Response.json({ ok: true });
}
