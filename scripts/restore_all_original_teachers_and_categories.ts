import { getAttendancePool } from '../lib/attendanceDb';
import { getDb } from '../lib/db';

async function main() {
  const pool = getAttendancePool();
  const db = await getDb();

  const roberId = '86ed908e-0e8d-4305-99cf-7f9eb8c0a281';
  const rocioId = '0221eaff-ecfa-45c7-9b09-c5146d693e6e';
  const santiagoId = '157b2ac4-ff1c-446d-96a5-0f34d5dfd5e0';
  const sebastianId = 'def350e5-cd36-4cd4-8b55-fbc82435d7db';

  console.log("=== RESTORING ORIGINAL TEACHER AND CATEGORY ASSIGNMENTS ===");

  // 1. Students belonging to Sebastian (Cat 2017 & 2018)
  const sebastianStudents = [
    'ROMERO TABORDA SOFIA MAGALI',
    'RIOS BASTIAN BENJAMIN',
    'UDRIBIU TIAN GERONIMO',
    'BASSA ARANDA TIZIANO'
  ];
  for (const name of sebastianStudents) {
    const year = name.includes('BASSA') ? 2018 : 2017;
    await pool.query(
      `UPDATE "Student" SET "teacherId" = $1, category = $2 WHERE UPPER(name) LIKE $3`,
      [sebastianId, year, `%${name.trim().toUpperCase()}%`]
    );
  }

  // 2. Students belonging to Santiago (Cat 2019, 2020, 2021)
  const santiagoStudents = [
    { name: 'BARRETO ARGUELLO THIAGO DANIEL', year: 2019 },
    { name: 'TORRICO RAMIRES MATEO AUGUSTO', year: 2020 },
    { name: 'GATTERO FRANCISCO BENJAMIN', year: 2020 },
    { name: 'BONETTA THIAGO AGUSTIN', year: 2021 },
    { name: 'CARDOZO MATEO LIONEL', year: 2021 }
  ];
  for (const s of santiagoStudents) {
    await pool.query(
      `UPDATE "Student" SET "teacherId" = $1, category = $2 WHERE UPPER(name) LIKE $3`,
      [santiagoId, s.year, `%${s.name.trim().toUpperCase()}%`]
    );
  }

  // 3. Students belonging to Rober (Cat 2013, 2014, 2015, 2016)
  const roberStudents = [
    { name: 'MINGO MILO LEON', year: 2013 },
    { name: 'CERON FABRICIO TOMAS', year: 2013 },
    { name: 'PEREZ IAN GABRIEL', year: 2013 },
    { name: 'ESCALANTE BENJAMIN SEBASTIAN', year: 2014 },
    { name: 'MAIDANA NOAH LAUTARO', year: 2014 },
    { name: 'MACIEL TIZIANO', year: 2014 },
    { name: 'LAGORIA JULIAN BENJAMIN', year: 2014 },
    { name: 'TOLEDO ULISES BENJAMIN', year: 2014 },
    { name: 'RODRIGUEZ MATEO', year: 2014 },
    { name: 'BOZA PUJAY JOSCELIN SARAI', year: 2015 },
    { name: 'BOZO PUJAY JOSELYN SARAI', year: 2015 },
    { name: 'LUCERO LEON', year: 2016 },
    { name: 'HUERTAS CAMPOS BENJAMIN BAUTISTA', year: 2016 }
  ];
  for (const r of roberStudents) {
    await pool.query(
      `UPDATE "Student" SET "teacherId" = $1, category = $2 WHERE UPPER(name) LIKE $3`,
      [roberId, r.year, `%${r.name.trim().toUpperCase()}%`]
    );
  }

  // 4. Students belonging to Rocio (Cat 2016 and 2026)
  const rocioStudents2026 = [
    'RAMIRO FARDELLI', 'MAXIMILIANO FLORES', 'ALEJANDRO ROMERO', 'FABRICIO HUCK',
    'MIGUEL AGUSTIN BARBOZA', 'TOMAS ARANDA OCAMPO', 'DAVID CARABAJAL',
    'FRANCISCO ZABALA', 'MARTIN CACERES', 'MAXIMILIANO INSAURRALDE', 'LUCAS LEAL', 'PAULA PEREZ'
  ];
  for (const name of rocioStudents2026) {
    await pool.query(
      `UPDATE "Student" SET "teacherId" = $1, category = $2 WHERE UPPER(name) LIKE $3`,
      [rocioId, 2026, `%${name.trim().toUpperCase()}%`]
    );
  }

  console.log("\n=== UPDATED BREAKDOWN IN NEON DB ===");
  const teacherCats = await pool.query(`
    SELECT s.category, t.name as teacher_name, t.id as teacher_id, COUNT(*) as count 
    FROM "Student" s
    JOIN "Teacher" t ON s."teacherId" = t.id
    GROUP BY s.category, t.name, t.id
    ORDER BY t.name, s.category
  `);
  console.log(teacherCats.rows);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
