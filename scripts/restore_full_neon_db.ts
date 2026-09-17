import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();

  console.log("=== STEP 1: CHECKING ALL TEACHERS IN NEON DB ===");
  const teachersRes = await pool.query(`SELECT id, name, username, role FROM "Teacher"`);
  console.log("Teachers:", teachersRes.rows);

  const teacherMapByName: Record<string, string> = {};
  teachersRes.rows.forEach(t => {
    teacherMapByName[t.name.toLowerCase()] = t.id;
  });

  const roberId = teacherMapByName['rober'] || '86ed908e-0e8d-4305-99cf-7f9eb8c0a281';
  const rocioId = teacherMapByName['rocio'] || '0221eaff-ecfa-45c7-9b09-c5146d693e6e';
  const santiagoId = teacherMapByName['santiago'] || '157b2ac4-ff1c-446d-96a5-0f34d5dfd5e0';
  const sebastianId = teacherMapByName['sebastian'] || 'def350e5-cd36-4cd4-8b55-fbc82435d7db';

  console.log("=== STEP 2: FINDING ALL DISTINCT STUDENTS IN ATTENDANCE TABLE ===");
  const attStudentsRes = await pool.query(`
    SELECT DISTINCT 
      a."studentId" as id,
      a.date
    FROM "Attendance" a
  `);
  console.log(`Found ${attStudentsRes.rows.length} distinct student IDs in Attendance table.`);

  console.log("=== STEP 3: CHECKING CURRENT STUDENT TABLE ===");
  const currentStudentsRes = await pool.query(`SELECT id, name, category, "teacherId", status FROM "Student"`);
  console.log(`Current students in Student table: ${currentStudentsRes.rows.length}`);

  const existingIds = new Set(currentStudentsRes.rows.map(r => r.id));

  // Check if any studentId from Attendance is missing from Student table
  const missingFromStudent = attStudentsRes.rows.filter(r => !existingIds.has(r.id));
  console.log(`Missing student IDs from Student table: ${missingFromStudent.length}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
