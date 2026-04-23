import { createPool } from '@vercel/postgres';

async function test() {
    const dbPostgres = createPool({ connectionString: process.env.POSTGRES_URL });

    try {
        console.log('Testing ALUMNOS 1. STUDENTS');
        await dbPostgres.query(`
            SELECT 
              s.id, s.name, s.category, s.group_name, s.gender, s.team, s.status, s.notes, s.monthly_quota, s.phone,
              (SELECT COUNT(*) FROM payments p WHERE p.student_id = s.id) as payment_count,
              (SELECT COALESCE(SUM(p.amount_paid), 0) FROM payments p WHERE p.student_id = s.id) as total_paid,
              (SELECT COALESCE(SUM(p.balance), 0) FROM payments p WHERE p.student_id = s.id) as total_balance,
              (SELECT COUNT(CASE WHEN ms.status = 'PAID' THEN 1 END) FROM monthly_status ms WHERE ms.student_id = s.id) as months_paid,
              (SELECT COUNT(CASE WHEN ms.status = 'UNPAID' THEN 1 END) FROM monthly_status ms WHERE ms.student_id = s.id) as months_unpaid,
              (SELECT COUNT(CASE WHEN ms.status = 'PARTIAL' THEN 1 END) FROM monthly_status ms WHERE ms.student_id = s.id) as months_partial
            FROM students s
            ORDER BY s.category, s.name
        `);
        console.log('1 OK');

        console.log('Testing ALUMNOS 2. MONTHLY STATUS');
        await dbPostgres.query('SELECT student_id, month, status FROM monthly_status');
        console.log('2 OK');

        console.log('Testing ALUMNOS 3. PAYMENTS');
        await dbPostgres.query(`
            SELECT id, student_id, payment_date, month_covered, amount_paid, month_value,
                   estado, rubro, method, receipt, balance, delay_days, info
            FROM payments
            ORDER BY payment_date DESC
        `);
        console.log('3 OK');

        console.log('Testing ALUMNOS 4. CATEGORIES');
        await dbPostgres.query('SELECT DISTINCT category FROM students ORDER BY category');
        console.log('4 OK');

        console.log('Testing RENDICION 1. RECONCILIATIONS');
        await dbPostgres.query(`
            SELECT 
              r.id, r.date, r.payment_count, r.rubro, 
              r.cash_total, r.transfer_total, r.grand_total,
              (SELECT COALESCE(SUM(p.amount_paid), 0) FROM payments p WHERE p.payment_date = r.date AND p.rubro = r.rubro) as cobrado
            FROM reconciliations r
            ORDER BY r.date DESC
        `);
        console.log('5 OK');

        console.log('ALL OK');
    } catch (e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
}

test();
