import { getDb } from '../lib/db';

async function main() {
  const db = await getDb();

  const totalCRM = await db.get("SELECT count(*) as c FROM students");
  console.log("TOTAL STUDENTS IN CRM SQLITE:", totalCRM.c);

  const byCategory = await db.all("SELECT category, count(*) as count FROM students GROUP BY category ORDER BY count DESC");
  console.log("CRM STUDENTS BY CATEGORY:", byCategory);

  const infantilLinked = await db.get("SELECT count(*) as c FROM students WHERE UPPER(category) = 'INFANTIL' AND academia_id IS NOT NULL");
  console.log("INFANTIL STUDENTS LINKED TO NEON DB:", infantilLinked.c);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
