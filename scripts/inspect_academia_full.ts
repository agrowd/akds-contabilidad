import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();

  console.log("=== TEACHERS IN NEON POSTGRES DB ===");
  const teachers = await pool.query(`SELECT id, name, username, role FROM "Teacher" ORDER BY name`);
  console.log(teachers.rows);

  console.log("\n=== STUDENTS PER TEACHER & CATEGORY IN NEON DB ===");
  const catTeacher = await pool.query(`
    SELECT t.name as teacher_name, s.category, s.turno, COUNT(*) as student_count 
    FROM "Student" s
    JOIN "Teacher" t ON s."teacherId" = t.id
    GROUP BY t.name, s.category, s.turno
    ORDER BY t.name, s.category
  `);
  console.log(catTeacher.rows);

  console.log("\n=== TOTAL STUDENTS PER TEACHER ===");
  const totalTeacher = await pool.query(`
    SELECT t.name as teacher_name, COUNT(*) as total_students 
    FROM "Student" s
    JOIN "Teacher" t ON s."teacherId" = t.id
    GROUP BY t.name
    ORDER BY t.name
  `);
  console.log(totalTeacher.rows);

  console.log("\n=== TOTAL ATTENDANCE RECORDS ===");
  const totalAtt = await pool.query(`SELECT COUNT(*) as total_records FROM "Attendance"`);
  console.log(totalAtt.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
