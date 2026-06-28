import { Pool } from 'pg';
import * as fs   from 'fs';
import * as path from 'path';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max:              10,
    });
  }
  return pool;
}

export async function runMigration(): Promise<void> {
  const sql = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf8',
  );
  const db = getPool();
  await db.query(sql);
  console.log('Database schema applied');
}
