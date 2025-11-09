import fs from 'fs/promises';
import path from 'path';
import mysql from 'mysql2/promise';
import { URL } from 'url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Please set DATABASE_URL env var');
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const user = parsed.username;
const password = parsed.password;
const host = parsed.hostname;
const port = parsed.port || '3306';
const database = parsed.pathname ? parsed.pathname.slice(1) : undefined;

if (!database) {
  console.error('No database in DATABASE_URL');
  process.exit(1);
}

const dir = path.join(process.cwd(), 'drizzle');

console.log(`Connecting to MySQL ${user}@${host}:${port}/${database}`);
const conn = await mysql.createConnection({ host, port: Number(port), user, password, database, multipleStatements: true });

try {
  const files = await fs.readdir(dir);
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
  for (const file of sqlFiles) {
    const p = path.join(dir, file);
    let sql = await fs.readFile(p, 'utf8');
    // Remove any migration generator breakpoint markers that are not valid SQL
    sql = sql.replace(/--\>\s*statement-breakpoint/g, ';');
    // Ensure statements end with semicolons
    if (!sql.trim().endsWith(';')) sql = sql.trim() + ';';
    console.log('\n---- Running', file);
    // Split into individual statements and run one-by-one so we can skip harmless duplicates
    const stmts = sql
      .split(/;\s*\n|;\s*$/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of stmts) {
      try {
        await conn.query(stmt);
      } catch (err) {
        const code = err && err.code ? err.code : null;
        // Ignore duplicate column / table errors and continue
        if (code === 'ER_DUP_FIELDNAME' || code === 'ER_TABLE_EXISTS_ERROR' || code === 'ER_DUP_KEYNAME') {
          console.warn('Ignored DB error (already exists):', code, stmt.split('\n')[0]);
          continue;
        }
        console.error('Failed to run statement in', file, err);
        throw err;
      }
    }
    console.log('OK');
  }
  console.log('\nAll SQL files executed');
} finally {
  await conn.end();
}
