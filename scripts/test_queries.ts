import { createPool } from '@vercel/postgres';

async function test() {
    const dbPostgres = createPool({ connectionString: process.env.POSTGRES_URL });

    try {
        console.log('Testing 1. STATS');
        await dbPostgres.query(`
            SELECT 
              (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) as total_revenue,
              (SELECT COUNT(*) FROM payments) as total_payments,
              (SELECT COALESCE(SUM(grand_total), 0) FROM reconciliations) as total_rendido,
              (SELECT COUNT(*) FROM students WHERE status = 'ACTIVE') as total_students
        `);
        console.log('1 OK');

        console.log('Testing 2. CATEGORIES');
        await dbPostgres.query('SELECT DISTINCT category FROM students');
        console.log('2 OK');

        console.log('Testing 3. STUDENTS');
        await dbPostgres.query(`
            SELECT s.id, s.name, s.category, s.status,
                   (SELECT COALESCE(SUM(amount_paid), 0) FROM payments p WHERE p.student_id = s.id) as total_paid
            FROM students s
            ORDER BY s.name
        `);
        console.log('3 OK');

        console.log('Testing 6. DEBTORS');
        await dbPostgres.query(`
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
            LIMIT 10
        `);
        console.log('6 OK');

        console.log('ALL OK');
    } catch (e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
}

test();
