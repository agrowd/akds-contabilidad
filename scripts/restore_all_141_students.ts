import { getDb } from '../lib/db';
import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const db = await getDb();
  const pool = getAttendancePool();

  console.log("=== RESTORING ALL CRM STUDENTS INTO NEON DB ===");

  const crmStudents = await db.all("SELECT * FROM students ORDER BY name ASC");
  console.log(`Total CRM students to process: ${crmStudents.length}`);

  const roberId = '86ed908e-0e8d-4305-99cf-7f9eb8c0a281';
  const rocioId = '0221eaff-ecfa-45c7-9b09-c5146d693e6e';
  const santiagoId = '157b2ac4-ff1c-446d-96a5-0f34d5dfd5e0';
  const sebastianId = 'def350e5-cd36-4cd4-8b55-fbc82435d7db';

  const neonRes = await pool.query(`SELECT id, crm_id, UPPER(name) as name, category, "teacherId" FROM "Student"`);
  const neonStudentsMapByCrmId = new Map(neonRes.rows.filter(r => r.crm_id).map(r => [Number(r.crm_id), r]));
  const neonStudentsMapByName = new Map(neonRes.rows.map(r => [r.name.trim().toUpperCase(), r]));

  let updatedCount = 0;
  let insertedCount = 0;

  for (const cStudent of crmStudents) {
    const sid = Number(cStudent.id);
    const sNameUpper = cStudent.name.trim().toUpperCase();

    let matchedAc = neonStudentsMapByCrmId.get(sid) || neonStudentsMapByName.get(sNameUpper);

    // Determine category year
    let catYear = 2016;
    if (cStudent.birth_date) {
      const bYear = new Date(cStudent.birth_date).getFullYear();
      if (bYear >= 2010 && bYear <= 2030) catYear = bYear;
    } else {
      const text = `${cStudent.category || ''} ${cStudent.group_name || ''} ${cStudent.notes || ''}`;
      const match = text.match(/\b(201[0-9]|202[0-9]|203[0-9])\b/);
      if (match) catYear = parseInt(match[1], 10);
    }

    // Determine teacher
    let targetTeacherId = roberId;
    const catUpper = (cStudent.category || '').toUpperCase();
    if (catUpper.includes('SD') || catUpper.includes('CDD') || catUpper.includes('TPP') || catUpper.includes('EXTERN') || catUpper.includes('OTROS') || catUpper.includes('RELACION')) {
      targetTeacherId = rocioId;
      catYear = 2016;
    } else if (catYear <= 2016) {
      targetTeacherId = roberId;
    } else if (catYear === 2017 || catYear === 2018) {
      targetTeacherId = sebastianId;
    } else if (catYear >= 2019) {
      targetTeacherId = santiagoId;
    }

    const studentStatus = cStudent.status === 'BAJA' ? 'BAJA' : (cStudent.status === 'SUSPENDIDO' ? 'SUSPENDIDO' : 'ACTIVE');

    if (matchedAc) {
      // Update existing neon student, preserving their original category and teacher if already present
      await pool.query(
        `UPDATE "Student" 
         SET status = $1, crm_id = $2, "birthDate" = COALESCE($3, "birthDate") 
         WHERE id = $4`,
        [studentStatus, sid, cStudent.birth_date ? new Date(cStudent.birth_date) : null, matchedAc.id]
      );
      if (cStudent.academia_id !== matchedAc.id) {
        await db.run('UPDATE students SET academia_id = ? WHERE id = ?', [matchedAc.id, sid]);
      }
      updatedCount++;
    } else {
      // Insert new student into Neon DB
      const newId = (await import('crypto')).randomUUID();
      await pool.query(
        `INSERT INTO "Student" (id, name, category, turno, "teacherId", status, crm_id, "birthDate") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          newId,
          cStudent.name,
          catYear,
          '1° turno',
          targetTeacherId,
          studentStatus,
          sid,
          cStudent.birth_date ? new Date(cStudent.birth_date) : null
        ]
      );
      await db.run('UPDATE students SET academia_id = ? WHERE id = ?', [newId, sid]);
      insertedCount++;
    }
  }

  console.log(`Updated ${updatedCount} existing Neon students.`);
  console.log(`Inserted ${insertedCount} new Neon students.`);

  console.log("\n=== FINAL NEON DB STUDENT COUNTS PER TEACHER ===");
  const countsRes = await pool.query(`
    SELECT t.name as teacher_name, s.category, COUNT(*) as count 
    FROM "Student" s 
    JOIN "Teacher" t ON s."teacherId" = t.id 
    GROUP BY t.name, s.category 
    ORDER BY t.name, s.category
  `);
  console.log(countsRes.rows);

  const totalNeon = await pool.query(`SELECT COUNT(*) as count FROM "Student"`);
  console.log(`TOTAL STUDENTS IN NEON POSTGRES DB NOW: ${totalNeon.rows[0].count}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
