import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db"; // adjust to your drizzle client path
import { event, eventTicket, paymentProof } from "@/db/schema"; // adjust path
import {
  createEventTicketSchema,
  toEventTicketDto,
} from "@/lib/eventTicket-dto"; // adjust path

// export async function GET(req: NextRequest) {
//   const user = await getProfile(req);

//   const rows = await db.select().from()
// }
