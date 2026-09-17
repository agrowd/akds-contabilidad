import { getDb } from '../lib/db';
import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const db = await getDb();
  const pool = getAttendancePool();

  console.log("=== CRM STUDENTS SAMPLE ===");
  const crmStudents = await db.all(`
    SELECT id, name, category, group_name, birth_date, enrollment_date, academia_id 
    FROM students 
    LIMIT 30
  `);
  console.log(crmStudents);

  console.log("\n=== ACADEMIA STUDENTS SAMPLE ===");
  const acStudents = await pool.query(`
    SELECT s.id, s.name, s.category, s.turno, s."teacherId", t.name as teacher_name, s.crm_id
    FROM "Student" s
    JOIN "Teacher" t ON s."teacherId" = t.id
    LIMIT 30
  `);
  console.log(acStudents.rows);

  console.log("\n=== ACADEMIA TEACHERS AND CATEGORIES LINK ===");
  const teacherCats = await pool.query(`
    SELECT s.category, t.id as teacher_id, t.name as teacher_name, COUNT(*) as student_count
    FROM "Student" s
    JOIN "Teacher" t ON s."teacherId" = t.id
    GROUP BY s.category, t.id, t.name
    ORDER BY s.category
  `);
  console.log(teacherCats.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
