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
    } catch (e) {
        console.log('phone already exists or error:', e.message);
    }

    console.log('Migration finished.');
    process.exit(0);
}

migrate();
