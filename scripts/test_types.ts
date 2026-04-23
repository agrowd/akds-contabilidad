import { createPool } from '@vercel/postgres';

async function testTypes() {
    const db = createPool({ connectionString: process.env.POSTGRES_URL });
    const { rows } = await db.query(`
        SELECT COALESCE(SUM(amount_paid), 0) as total_revenue
        FROM payments
    `);
    
    console.log(rows[0]);
    console.log('Type of total_revenue:', typeof rows[0].total_revenue);

    process.exit(0);
}

testTypes();
