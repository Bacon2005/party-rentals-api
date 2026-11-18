"use server";

import { z } from "zod";
import { requireTier } from "@/lib/auth";

const eventReference = z.object({ eventId: z.uuid() });
const messageSchema = eventReference.extend({ message: z.string().trim().min(1).max(2000) });
const partySchema = z.object({ name: z.string().trim().min(1).max(200) });

// TODO: Connect web forms to the existing reservation API's transaction logic.
export async function rsvp(form: FormData) {
  await requireTier("verified_guest");
  const parsed = eventReference.safeParse({ eventId: form.get("eventId") });
  if (!parsed.success) return { error: "Choose a valid event." };
  return { error: "Web RSVP is not implemented yet. Ticket reservations use /api/reservations." };
}

// TODO: Add message storage and recipient authorization before enabling send.
export async function messageHost(form: FormData) {
  await requireTier("verified_guest");
  const parsed = messageSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Choose an event and enter a message (up to 2000 characters)." };
  return { error: "Messaging is not implemented yet." };
}

// TODO: Add the web creation form. The Expo app already uses the gated event API.
export async function createParty(form: FormData) {
  await requireTier("verified_host");
  const parsed = partySchema.safeParse({ name: form.get("name") });
  if (!parsed.success) return { error: "Enter a party name." };
  return { error: "Web party creation is not implemented yet. Event creation uses /api/events." };
}
