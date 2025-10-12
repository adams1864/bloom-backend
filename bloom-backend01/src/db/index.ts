import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { databaseSchema } from "./schema.js";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
});

export const db = drizzle(pool, { schema: databaseSchema, mode: "mysql2" } as any);
