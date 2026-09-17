import { getAttendancePool } from '../lib/attendanceDb';

async function main() {
  const pool = getAttendancePool();

  console.log("=== TABLES IN NEON DB ===");
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log(tables.rows);

  for (const t of tables.rows) {
    const name = t.table_name;
    const countRes = await pool.query(`SELECT COUNT(*) FROM "${name}"`);
    console.log(`Table ${name}: ${countRes.rows[0].count} rows`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
