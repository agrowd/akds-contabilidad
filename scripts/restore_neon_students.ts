import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();

  console.log("=== ALL ATTENDANCE STUDENT IDs AND RECORD COUNT ===");
  const attStudents = await pool.query(`
    SELECT "studentId", COUNT(*) as att_count 
    FROM "Attendance" 
    GROUP BY "studentId"
  `);
  console.log(attStudents.rows);

  console.log("\n=== DISTINCT STUDENT IDs IN ATTENDANCE MISSING FROM STUDENT TABLE ===");
  const missingStudents = await pool.query(`
    SELECT DISTINCT a."studentId"
    FROM "Attendance" a
    LEFT JOIN "Student" s ON a."studentId" = s.id
    WHERE s.id IS NULL
  `);
  console.log(missingStudents.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
