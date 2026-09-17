import { getDb } from '../lib/db';
import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const db = await getDb();
  const pool = getAttendancePool();

  const infantilCount = await db.get("SELECT count(*) as c FROM students WHERE UPPER(category) = 'INFANTIL'");
  console.log("INFANTIL STUDENTS IN CRM:", infantilCount.c);

  const nonInfantilCount = await db.get("SELECT count(*) as c FROM students WHERE UPPER(category) != 'INFANTIL'");
  console.log("NON-INFANTIL STUDENTS IN CRM:", nonInfantilCount.c);

  const infantilByYear: Record<number, number> = {};
  const infantilStudents = await db.all("SELECT id, name, category, group_name, birth_date, notes FROM students WHERE UPPER(category) = 'INFANTIL'");
  
  infantilStudents.forEach(s => {
    let year = 2016;
    if (s.birth_date) {
      const y = new Date(s.birth_date).getFullYear();
      if (y >= 2010 && y <= 2030) year = y;
    } else {
      const text = `${s.group_name || ''} ${s.notes || ''}`;
      const match = text.match(/\b(201[0-9]|202[0-9]|203[0-9])\b/);
      if (match) year = parseInt(match[1], 10);
    }
    infantilByYear[year] = (infantilByYear[year] || 0) + 1;
  });

  console.log("INFANTIL STUDENTS BY BIRTH YEAR CATEGORY:", infantilByYear);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
