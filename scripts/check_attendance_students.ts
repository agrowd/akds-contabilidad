import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();

  const attStudents = await pool.query(`SELECT DISTINCT "studentId" FROM "Attendance"`);
  console.log(`Total distinct student IDs in Attendance table: ${attStudents.rows.length}`);

  const missing = await pool.query(`
    SELECT DISTINCT a."studentId" 
    FROM "Attendance" a 
    LEFT JOIN "Student" s ON a."studentId" = s.id 
    WHERE s.id IS NULL
  `);
  console.log(`Attendance records whose Student row in Student table is missing: ${missing.rows.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
