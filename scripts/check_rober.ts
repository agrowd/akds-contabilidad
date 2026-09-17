import { getAttendancePool } from '../lib/attendanceDb';
import { getDb } from '../lib/db';

async function main() {
  const pool = getAttendancePool();
  const db = await getDb();

  const roberRes = await pool.query(
    `SELECT s.id, s.name, s.category, s.crm_id 
     FROM "Student" s 
     WHERE s."teacherId" = '86ed908e-0e8d-4305-99cf-7f9eb8c0a281' 
     ORDER BY s.category, s.name`
  );
  console.log("TOTAL ROBER STUDENTS IN NEON:", roberRes.rows.length);

  const crmStudents = await db.all('SELECT id, name, category, group_name FROM students');
  const crmMap = new Map(crmStudents.map(c => [c.id, c]));

  const breakdown: Record<string, number> = {};
  roberRes.rows.forEach(r => {
    const crm = crmMap.get(r.crm_id);
    const cat = crm ? crm.category : ('UNLINKED_NEON_CAT_' + r.category);
    breakdown[cat] = (breakdown[cat] || 0) + 1;
  });

  console.log("ROBER CATEGORY BREAKDOWN IN CRM:", breakdown);

  console.log("\nSAMPLE UNLINKED OR INCLUSIVO STUDENTS IN ROBER:");
  roberRes.rows.forEach(r => {
    const crm = crmMap.get(r.crm_id);
    if (!crm || crm.category !== 'INFANTIL') {
      console.log({
        neon_id: r.id,
        name: r.name,
        neon_category: r.category,
        crm_id: r.crm_id,
        crm_category: crm?.category,
        crm_group: crm?.group_name
      });
    }
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
