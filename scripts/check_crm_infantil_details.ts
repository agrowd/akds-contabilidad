import { getDb } from '../lib/db';
import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const db = await getDb();
  const pool = getAttendancePool();

  const crmStudents = await db.all("SELECT id, name, category, group_name, birth_date, notes FROM students WHERE UPPER(category) = 'INFANTIL' ORDER BY name");
  console.log("=== INFANTIL CRM STUDENTS ===");
  console.log(crmStudents);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
