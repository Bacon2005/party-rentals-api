// Create your tables here
import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable(
  "profiles",
  {
    //Column definitions
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default("client"),
  },
  (table) => [
    uniqueIndex("profiles_one_admin")
      .on(table.role)
      .where(sql`${table.role} = 'admin'`),
  ],
).enableRLS();
