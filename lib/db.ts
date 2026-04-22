import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  // Database is inside the project root (guido/akds-dashboard/akds.sqlite)
  const dbPath = path.resolve(process.cwd(), 'akds.sqlite');

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  return db;
}
