import { createPool } from '@vercel/postgres';

async function check() {
    const db = createPool({ connectionString: process.env.POSTGRES_URL });
    const res = await db.query(`SELECT category, status, COUNT(*) as count FROM students GROUP BY category, status`);
    console.log(res.rows);
    process.exit(0);
}

check();
