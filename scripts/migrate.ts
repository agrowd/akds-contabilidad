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

    const isProd = !!process.env.POSTGRES_URL;
    const serialType = isProd ? 'SERIAL' : 'INTEGER';
    const autoIncrement = isProd ? '' : 'AUTOINCREMENT';

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS clothing_catalog (
                id ${serialType} PRIMARY KEY ${isProd ? '' : 'AUTOINCREMENT'},
                name TEXT UNIQUE,
                price REAL DEFAULT 0
            )
        `);
        console.log('Created table clothing_catalog');
    } catch (e: any) {
        console.log('Error creating clothing_catalog:', e.message);
    }

    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS student_extra_charges (
                id ${serialType} PRIMARY KEY ${isProd ? '' : 'AUTOINCREMENT'},
                student_id INTEGER,
                rubro TEXT,
                item_name TEXT,
                amount REAL DEFAULT 0,
                due_date TEXT,
                status TEXT DEFAULT 'UNPAID',
                notes TEXT DEFAULT ''
            )
        `);
        console.log('Created table student_extra_charges');
    } catch (e: any) {
        console.log('Error creating student_extra_charges:', e.message);
    }

    try {
        await db.run('ALTER TABLE monthly_status ADD COLUMN disabled_reason TEXT');
        console.log('Added disabled_reason to monthly_status');
    } catch (e: any) {
        console.log('disabled_reason already exists or error:', e.message);
    }

    console.log('Migration finished.');
    process.exit(0);
}

migrate();
