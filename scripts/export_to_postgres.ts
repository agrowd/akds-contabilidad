import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createPool } from '@vercel/postgres';
import path from 'path';

async function migrate() {
    console.log('🔄 Migrating data from SQLite to Postgres...');
    
    if (!process.env.POSTGRES_URL) {
        console.error('❌ POSTGRES_URL missing.');
        process.exit(1);
    }

    const sqlitePath = path.resolve(process.cwd(), 'akds.sqlite');
    const dbSqlite = await open({ filename: sqlitePath, driver: sqlite3.Database });
    const dbPostgres = createPool({ connectionString: process.env.POSTGRES_URL });

    // Helper to convert ? to $1
    const q = (sql: string) => {
        let i = 1;
        return sql.replace(/\?/g, () => `$${i++}`);
    };

    try {
        // 1. Students (Skipped)
        // 2. Payments (Skipped)
        // 3. Monthly Status (Skipped)

        // 4. Reconciliations
        console.log(' - Moving reconciliations...');
        const reconciliations = await dbSqlite.all('SELECT * FROM reconciliations');
        for (const r of reconciliations) {
            await dbPostgres.query(q(`INSERT INTO reconciliations (id, date, payment_count, rubro, cash_total, transfer_total, grand_total, cobrado) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`), 
                [r.id, r.date, r.payment_count, r.rubro, r.cash_total, r.transfer_total, r.grand_total, r.cobrado]);
        }

        // 5. Monthly Summary
        console.log(' - Moving monthly summary...');
        const summaries = await dbSqlite.all('SELECT * FROM monthly_summary');
        for (const s of summaries) {
            await dbPostgres.query(q(`INSERT INTO monthly_summary (month, rubro, total) VALUES (?,?,?) ON CONFLICT (rubro, month) DO NOTHING`), 
                [s.month, s.rubro, s.total]);
        }

        console.log('✅ Migration complete!');
    } catch (e) {
        console.error('❌ Migration failed:', e);
    }
    process.exit(0);
}

migrate();
