import { getDb } from '../lib/db';
import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const db = await getDb();
  const pool = getAttendancePool();

  console.log("=== CHECKING BIRTHDAYS IN SQLITE CRM ===");
  const sqliteBdays = await db.all("SELECT id, name, birth_date, category FROM students WHERE birth_date IS NOT NULL AND birth_date != ''");
  console.log(`SQLite CRM students with birth_date: ${sqliteBdays.length}`);

  console.log("\n=== CHECKING BIRTHDAYS IN NEON DB ===");
  const neonBdays = await pool.query(`SELECT id, name, category, "birthDate" FROM "Student" WHERE "birthDate" IS NOT NULL`);
  console.log(`Neon DB students with birthDate: ${neonBdays.rows.length}`);
  console.log(neonBdays.rows.slice(0, 15));

  console.log("\n=== SAMPLE ALL STUDENTS IN SQLITE ===");
  const allSqlite = await db.all("SELECT id, name, birth_date, category FROM students LIMIT 15");
  console.log(allSqlite);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
