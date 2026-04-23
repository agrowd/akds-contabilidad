import { createPool } from '@vercel/postgres';

async function fixSchema() {
    console.log('Fixing schema...');
    const db = createPool({ connectionString: process.env.POSTGRES_URL });

    try {
        await db.query(`ALTER TABLE reconciliations ADD COLUMN IF NOT EXISTS payment_count INTEGER DEFAULT 0;`);
        await db.query(`ALTER TABLE reconciliations ADD COLUMN IF NOT EXISTS cash_total REAL DEFAULT 0;`);
        await db.query(`ALTER TABLE reconciliations ADD COLUMN IF NOT EXISTS transfer_total REAL DEFAULT 0;`);
        console.log('reconciliations fixed.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS staff_payments (
                id SERIAL PRIMARY KEY,
                date TEXT,
                recipient TEXT,
                amount REAL,
                academy TEXT
            );
        `);
        console.log('staff_payments created.');

    } catch (e) {
        console.error('ERROR:', e);
    }
    process.exit(0);
}

fixSchema();
