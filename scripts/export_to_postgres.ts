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
        // 1. Students
        console.log(' - Moving students...');
        const students = await dbSqlite.all('SELECT * FROM students');
        for (const s of students) {
            await dbPostgres.query(q(`INSERT INTO students (id, name, category, group_name, gender, team, status, notes, monthly_quota, phone) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`), 
                [s.id, s.name, s.category, s.group_name, s.gender, s.team, s.status, s.notes, s.monthly_quota, s.phone]);
        }

        // 2. Payments
        console.log(' - Moving payments...');
        const payments = await dbSqlite.all('SELECT * FROM payments');
        for (const p of payments) {
            await dbPostgres.query(q(`INSERT INTO payments (id, student_id, payment_date, month_covered, amount_paid, month_value, estado, rubro, method, receipt, due_date, balance, delay_days, info) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`), 
                [p.id, p.student_id, p.payment_date, p.month_covered, p.amount_paid, p.month_value, p.estado, p.rubro, p.method, p.receipt, p.due_date, p.balance, p.delay_days, p.info]);
        }

        // 3. Monthly Status
        console.log(' - Moving monthly status...');
        const statuses = await dbSqlite.all('SELECT * FROM monthly_status');
        for (const st of statuses) {
            await dbPostgres.query(q(`INSERT INTO monthly_status (student_id, month, status) VALUES (?,?,?) ON CONFLICT (student_id, month) DO NOTHING`), 
                [st.student_id, st.month, st.status]);
        }

        console.log('✅ Migration complete!');
    } catch (e) {
        console.error('❌ Migration failed:', e);
    }
    process.exit(0);
}

migrate();
