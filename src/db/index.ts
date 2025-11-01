import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { createPool } from "mysql2/promise";
import { Pool } from "pg";
import * as schema from "./schema.js";

type Database = MySql2Database<typeof schema>;

let db: Database;

if (process.env.DB_DIALECT === "mysql") {
  const connectionUri = process.env.DATABASE_URL;
  if (!connectionUri) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = createPool(connectionUri);
  db = drizzle(pool, { schema, mode: "default" });
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
  db = drizzlePg(pool, { schema }) as unknown as Database;
}

export { db };