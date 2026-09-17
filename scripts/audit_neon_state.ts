import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();

  console.log("=== DISTINCT STUDENT IDs IN ATTENDANCE TABLE ===");
  const attRes = await pool.query(`
    SELECT DISTINCT a."studentId"
    FROM "Attendance" a
  `);
  console.log(`Total distinct student IDs in Attendance: ${attRes.rows.length}`);

  console.log("=== CURRENT STUDENTS IN STUDENT TABLE ===");
  const studRes = await pool.query(`
    SELECT s.id, s.name, s.category, s."teacherId", t.name as teacher_name, s.crm_id
    FROM "Student" s
    LEFT JOIN "Teacher" t ON s."teacherId" = t.id
    ORDER BY s.category, t.name, s.name
  `);
  console.log(`Total students in Student table: ${studRes.rows.length}`);
  console.log(studRes.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
