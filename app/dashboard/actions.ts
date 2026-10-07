"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
//import { customers } from "@/db/schema";
import { getProfile } from "@/lib/auth";
//import { addEntry, readCustomer } from "@/lib/customers";
//import { CustomerSchema, EntrySchema } from "@/lib/definitions";
import { createClient } from "@/lib/supabase/server";

export type PostState = { message: string; name: string; balance: string };

export type EntryState = { message: string; amount: string };

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
