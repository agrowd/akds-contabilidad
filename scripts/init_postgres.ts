import { getDb } from '../lib/db';

async function init() {
    console.log('🚀 Initializing Postgres Schema...');
    const db = await getDb();

    if (!process.env.POSTGRES_URL) {
        console.error('❌ POSTGRES_URL missing. Run this with the env var set.');
        process.exit(1);
    }

    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                group_name TEXT,
                gender TEXT,
                team TEXT,
                status TEXT DEFAULT 'ACTIVE',
                notes TEXT,
                monthly_quota REAL DEFAULT 0,
                phone TEXT DEFAULT ''
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id),
                payment_date TEXT,
                month_covered TEXT,
                amount_paid REAL,
                month_value REAL,
                estado TEXT,
                rubro TEXT,
                method TEXT,
                receipt TEXT,
                due_date TEXT,
                balance REAL,
                delay_days INTEGER,
                info TEXT
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS monthly_status (
                student_id INTEGER REFERENCES students(id),
                month TEXT,
                status TEXT,
                PRIMARY KEY (student_id, month)
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS reconciliations (
                id SERIAL PRIMARY KEY,
                date TEXT,
                rubro TEXT,
                grand_total REAL
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS monthly_summary (
                rubro TEXT,
                month TEXT,
                total REAL,
                PRIMARY KEY (rubro, month)
            );
        `);

        console.log('✅ Schema created successfully!');
    } catch (e) {
        console.error('❌ Error creating schema:', e);
    }
    process.exit(0);
}

init();
