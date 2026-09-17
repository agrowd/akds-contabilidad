import { getDb } from '../lib/db';
import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const db = await getDb();
  const pool = getAttendancePool();

  console.log("=== CLEANING NON-INFANTIL CRM STUDENTS FROM NEON DB ===");

  // Get non-infantil CRM student IDs
  const nonInfantilCRM = await db.all("SELECT id, name, category FROM students WHERE UPPER(category) != 'INFANTIL'");
  const nonInfantilIds = nonInfantilCRM.map(s => s.id);
  console.log(`Found ${nonInfantilIds.length} non-infantil CRM students.`);

  // Delete attendance and student records in Neon DB linked to non-infantil CRM IDs
  if (nonInfantilIds.length > 0) {
    const placeholders = nonInfantilIds.map((_, i) => `$${i + 1}`).join(', ');
    
    // Get matching Neon student IDs
    const neonRes = await pool.query(`SELECT id FROM "Student" WHERE crm_id IN (${placeholders})`, nonInfantilIds);
    const neonIds = neonRes.rows.map(r => r.id);
    console.log(`Found ${neonIds.length} Neon DB student records linked to non-infantil CRM students.`);

    if (neonIds.length > 0) {
      const neonPlaceholders = neonIds.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(`DELETE FROM "Attendance" WHERE "studentId" IN (${neonPlaceholders})`, neonIds);
      await pool.query(`DELETE FROM "Student" WHERE id IN (${neonPlaceholders})`, neonIds);
      console.log(`Successfully removed ${neonIds.length} non-infantil student records and their attendance from Neon DB.`);
    }
  }

  // Clear academia_id from non-infantil CRM students
  await db.run("UPDATE students SET academia_id = NULL WHERE UPPER(category) != 'INFANTIL'");

  console.log("\n=== VERIFYING ROBER STUDENTS IN NEON DB ===");
  const roberRes = await pool.query(
    `SELECT s.id, s.name, s.category, s.crm_id 
     FROM "Student" s 
     WHERE s."teacherId" = '86ed908e-0e8d-4305-99cf-7f9eb8c0a281' 
     ORDER BY s.name`
  );
  console.log("ROBER TOTAL STUDENTS IN NEON NOW:", roberRes.rows.length);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
