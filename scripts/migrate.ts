import { getDb } from '../lib/db';

async function migrate() {
    const db = await getDb();
    console.log('Running migrations...');
    
    try {
        await db.run('ALTER TABLE students ADD COLUMN monthly_quota REAL DEFAULT 0');
        console.log('Added monthly_quota to students');
    } catch (e) {
        console.log('monthly_quota already exists or error:', e.message);
    }

    try {
        await db.run('ALTER TABLE students ADD COLUMN phone TEXT');
        console.log('Added phone to students');
    } catch (e: any) {
        console.log('phone already exists or error:', e.message);
    }

    try {
        await db.run("ALTER TABLE students ADD COLUMN period_end_date TEXT DEFAULT '2026-12-31'");
        console.log('Added period_end_date to students');
    } catch (e: any) {
        console.log('period_end_date already exists or error:', e.message);
    }

    console.log('Migration finished.');
    process.exit(0);
}

migrate();
