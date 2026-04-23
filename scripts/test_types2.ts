import { createPool } from '@vercel/postgres';

async function testTypes() {
    const db = createPool({ connectionString: process.env.POSTGRES_URL });

    console.log('--- STATS ---');
    const stats = await db.query(`
    SELECT 
      (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) as total_revenue,
      (SELECT COUNT(*) FROM payments) as total_payments,
      (SELECT COALESCE(SUM(grand_total), 0) FROM reconciliations) as total_rendido,
      (SELECT COUNT(*) FROM students WHERE status = 'ACTIVE') as total_students
    `);
    console.log(stats.rows[0]);
    console.log('total_payments type:', typeof stats.rows[0].total_payments);
    console.log('total_revenue type:', typeof stats.rows[0].total_revenue);

    console.log('--- DEBTORS ---');
    const debtors = await db.query(`
    SELECT s.id, s.name, s.category,
           COUNT(CASE WHEN ms.status = 'UNPAID' THEN 1 END) as unpaid_months,
           COUNT(CASE WHEN ms.status = 'PAID' THEN 1 END) as paid_months,
           COALESCE(SUM(CASE WHEN ms.status = 'UNPAID' THEN 1 END), 0) as debt_count
    FROM students s
    LEFT JOIN monthly_status ms ON s.id = ms.student_id
    WHERE s.category IN ('INFANTIL', 'ESCUELA SD')
    GROUP BY s.id
    HAVING COUNT(CASE WHEN ms.status = 'UNPAID' THEN 1 END) > 0
    ORDER BY unpaid_months DESC
    LIMIT 1
    `);
    console.log(debtors.rows[0]);
    if (debtors.rows[0]) {
        console.log('unpaid_months type:', typeof debtors.rows[0].unpaid_months);
    }

    process.exit(0);
}

testTypes();
