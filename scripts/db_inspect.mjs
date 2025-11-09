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

console.log(`Connecting to MySQL ${user}@${host}:${port}/${database}`);

try {
  const conn = await mysql.createConnection({
    host,
    port: Number(port),
    user,
    password,
    database,
  });

  const [tables] = await conn.query("SHOW TABLES");
  console.log('Tables:');
  console.log(tables);

  for (const row of tables) {
    const tableName = Object.values(row)[0];
    console.log('\nTable:', tableName);
    const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\``);
    console.log(cols.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null, Key: c.Key }))); 
  }

  await conn.end();
} catch (err) {
  console.error('DB inspect failed', err);
  process.exit(1);
}
