import "../env.js";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { createPool } from "mysql2/promise";
import { Pool } from "pg";
import * as schema from "./schema.js";

type Database = MySql2Database<typeof schema>;

const dialect = (process.env.DB_DIALECT ?? "mysql").toLowerCase();
const connectionUri = process.env.DATABASE_URL;

if (!connectionUri) {
	throw new Error("DATABASE_URL is not set");
}

let db: Database;

if (dialect === "mysql" || dialect === "mariadb") {
	const pool = createPool(connectionUri);
	db = drizzle(pool, { schema, mode: "default" });
} else {
	const pool = new Pool({
		connectionString: connectionUri,
		ssl:
			process.env.NODE_ENV === "production"
				? { rejectUnauthorized: false }
				: false,
	});
	db = drizzlePg(pool, { schema }) as unknown as Database;
}

export { db };