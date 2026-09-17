import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();

  console.log("=== ALL STUDENTS IN NEON DB CURRENTLY ===");
  const students = await pool.query(`
    SELECT s.id, s.name, s.category, s."teacherId", s.crm_id, t.name as teacher_name
    FROM "Student" s
    JOIN "Teacher" t ON s."teacherId" = t.id
    ORDER BY t.name, s.category, s.name
  `);
  console.log(students.rows);

  console.log("\n=== ATTENDANCE RECORDS SAMPLE WITH STUDENT NAME ===");
  const attRes = await pool.query(`
    SELECT DISTINCT s.id, s.name, s.category, s."teacherId", t.name as teacher_name
    FROM "Attendance" a
    JOIN "Student" s ON a."studentId" = s.id
    JOIN "Teacher" t ON s."teacherId" = t.id
  `);
  console.log(attRes.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
