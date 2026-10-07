import { drizzle } from "drizzle-orm/node-postgres";
import postgres from "postgres";
// One db for every route to import
// prepare: false is required by the Transaction pooler
const url = process.env.DATABASE_URL;

if (!url) throw new Error("Set DATABASE_URL in .env");

const client = postgres(url, { prepare: false });

export const db = drizzle(client);
