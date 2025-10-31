import "dotenv/config";
import { defineConfig } from "drizzle-kit";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const dialect = process.env.DB_DIALECT === "mysql" ? "mysql" : "postgresql";
const out = dialect === "mysql" ? "./drizzle-mysql" : "./drizzle";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: out,
  dialect: dialect,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});