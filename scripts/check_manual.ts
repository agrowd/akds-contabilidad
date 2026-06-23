import { getDb } from '../lib/db';

async function check() {
    const db = await getDb();
    const payments = await db.all("SELECT id, student_id, amount_paid, month_value, balance, estado, info FROM payments WHERE balance != 0 LIMIT 10");
    console.log("PAYMENTS WITH NON-ZERO BALANCE:");
    console.log(JSON.stringify(payments, null, 2));
    process.exit(0);
}

check();
