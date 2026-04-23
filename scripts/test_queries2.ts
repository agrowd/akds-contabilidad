import { createPool } from '@vercel/postgres';

async function test() {
    const dbPostgres = createPool({ connectionString: process.env.POSTGRES_URL });

    try {
        console.log('Testing 1. PAYMENTS');
        await dbPostgres.query(`
            SELECT 
              p.id, p.student_id, s.name as student_name, s.category,
              p.payment_date, p.month_covered, p.amount_paid, p.month_value,
              p.estado, p.rubro, p.method, p.receipt, p.balance, p.delay_days, p.info
            FROM payments p
            JOIN students s ON p.student_id = s.id
            ORDER BY p.payment_date DESC, p.id DESC
        `);
        console.log('1 OK');

        console.log('Testing 2. STATS');
        await dbPostgres.query(`
            SELECT 
              COUNT(*) as total_payments,
              COALESCE(SUM(amount_paid), 0) as total_amount,
              COALESCE(SUM(CASE WHEN estado = 'ABONADA' THEN amount_paid ELSE 0 END), 0) as total_abonada,
              COALESCE(SUM(CASE WHEN estado = 'PENDIENTE' THEN amount_paid ELSE 0 END), 0) as total_pendiente,
              COALESCE(SUM(balance), 0) as total_balance
            FROM payments
        `);
        console.log('2 OK');

        console.log('Testing 3. MONTHLY SUMMARY');
        await dbPostgres.query(`
            SELECT rubro, month, total
            FROM monthly_summary
            ORDER BY rubro, 
              CASE month
                WHEN 'ENERO' THEN 1 WHEN 'FEBRERO' THEN 2 WHEN 'MARZO' THEN 3
                WHEN 'ABRIL' THEN 4 WHEN 'MAYO' THEN 5 WHEN 'JUNIO' THEN 6
                WHEN 'JULIO' THEN 7 WHEN 'AGOSTO' THEN 8 WHEN 'SEPTIEMBRE' THEN 9
                WHEN 'OCTUBRE' THEN 10 WHEN 'NOVIEMBRE' THEN 11 WHEN 'DICIEMBRE' THEN 12
              END
        `);
        console.log('3 OK');

        console.log('Testing 4. RUBROS');
        await dbPostgres.query(`SELECT DISTINCT rubro FROM payments WHERE rubro != '' ORDER BY rubro`);
        console.log('4 OK');

        console.log('ALL OK');
    } catch (e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
}

test();
