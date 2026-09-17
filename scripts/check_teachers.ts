import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();
  
  console.log("=== TEACHERS ===");
  const teachers = await pool.query(`SELECT id, name, username, role FROM "Teacher" ORDER BY name`);
  console.log(teachers.rows);

  console.log("\n=== STUDENTS PER CATEGORY & TEACHER ===");
  const catTeacher = await pool.query(`
    SELECT s.category, t.name as teacher_name, t.id as teacher_id, COUNT(*) as count 
    FROM "Student" s
    JOIN "Teacher" t ON s."teacherId" = t.id
    GROUP BY s.category, t.name, t.id
    ORDER BY s.category, t.name
  `);
  console.log(catTeacher.rows);

  console.log("\n=== COLUMNS IN STUDENT TABLE ===");
  const studentCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Student'
  `);
  console.log(studentCols.rows);

  console.log("\n=== COLUMNS IN TEACHER TABLE ===");
  const teacherCols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Teacher'
  `);
  console.log(teacherCols.rows);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
