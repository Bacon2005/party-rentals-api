"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";

import { getProfile } from "@/lib/auth";

import { createClient } from "@/lib/supabase/server";

export type PostState = { message: string; name: string; balance: string };

export type EntryState = { message: string; amount: string };

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
