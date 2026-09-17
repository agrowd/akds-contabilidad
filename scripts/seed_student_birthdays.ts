import { getDb } from '../lib/db';
import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const db = await getDb();
  const pool = getAttendancePool();

  console.log("=== SEEDING BIRTH DATES FOR ALL STUDENTS ===");

  const students = await db.all("SELECT id, name, category, group_name, notes, birth_date FROM students");
  console.log(`Total CRM students: ${students.length}`);

  let updatedCount = 0;

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    
    // If student already has a valid birth_date, skip or keep it
    if (s.birth_date && s.birth_date.length >= 8) {
      continue;
    }

    // Determine birth year from category or group
    let year = 2016;
    if (s.category && !isNaN(Number(s.category))) {
      year = Number(s.category);
    } else {
      const text = `${s.category || ''} ${s.group_name || ''} ${s.notes || ''}`;
      const match = text.match(/\b(201[0-9]|202[0-9]|203[0-9])\b/);
      if (match) {
        year = parseInt(match[1], 10);
      }
    }

    // Distribute month (1-12) and day (1-28) deterministically based on student ID / index
    const month = (i % 12) + 1;
    const day = ((i * 7) % 28) + 1;

    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const birthDateStr = `${year}-${monthStr}-${dayStr}`;

    // Update SQLite
    await db.run("UPDATE students SET birth_date = ? WHERE id = ?", [birthDateStr, s.id]);

    // Update Neon Postgres DB if matching student exists
    await pool.query(
      `UPDATE "Student" SET "birthDate" = $1 WHERE crm_id = $2 OR UPPER(name) = UPPER($3)`,
      [new Date(birthDateStr), s.id, s.name.trim()]
    );

    updatedCount++;
  }

  console.log(`Successfully assigned birth dates to ${updatedCount} students.`);

  // Verify counts of birthdays in current month (September)
  const currentMonthIdx = new Date().getMonth() + 1; // September = 9
  const septBdays = await db.all(
    `SELECT name, category, birth_date FROM students WHERE strftime('%m', birth_date) = ? ORDER BY birth_date`,
    [String(currentMonthIdx).padStart(2, '0')]
  );

  console.log(`\n=== CUMPLEAÑOS EN EL MES ACTUAL (MES ${currentMonthIdx}): ${septBdays.length} ALUMNOS ===`);
  console.log(septBdays);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
