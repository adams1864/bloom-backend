import { drizzle } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { createPool } from "mysql2/promise";
import { Pool } from "pg";
import * as schema from "./schema.js";

let db;

if (process.env.DB_DIALECT === "mysql") {
  const pool = createPool({
    uri: process.env.DATABASE_URL,
  });
  db = drizzle(pool, { schema, mode: "default" });
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });
  db = drizzlePg(pool, { schema });
}

export { db };