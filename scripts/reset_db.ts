import { getDb } from '../lib/db';

async function resetAndRebuildDb() {
  console.log('🔄 Iniciando el reinicio total de la base de datos...');
  const db = await getDb();
  
  const isProd = !!process.env.POSTGRES_URL;
  console.log(`📡 Entorno detectado: ${isProd ? 'Postgres (Vercel)' : 'SQLite (Local)'}`);

  try {
    if (isProd) {
      console.log('🗑️ Eliminando tablas en Postgres...');
      await db.exec(`
        DROP TABLE IF EXISTS monthly_summary CASCADE;
        DROP TABLE IF EXISTS staff_payments CASCADE;
        DROP TABLE IF EXISTS reconciliations CASCADE;
        DROP TABLE IF EXISTS payments CASCADE;
        DROP TABLE IF EXISTS monthly_status CASCADE;
        DROP TABLE IF EXISTS students CASCADE;
      `);
      
      console.log('🏗️ Reconstruyendo tablas en Postgres...');
      await db.exec(`
        CREATE TABLE students (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE,
            category TEXT,
            group_name TEXT,
            gender TEXT,
            team TEXT,
            status TEXT DEFAULT 'ACTIVE',
            notes TEXT DEFAULT '',
            monthly_quota REAL DEFAULT 0,
            phone TEXT,
            enrollment_date TEXT DEFAULT '2026-02-01'
        );

        CREATE TABLE monthly_status (
            student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
            year TEXT,
            month TEXT,
            status TEXT,
            PRIMARY KEY (student_id, year, month)
        );

        CREATE TABLE payments (
            id SERIAL PRIMARY KEY,
            student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
            payment_date TEXT,
            month_covered TEXT,
            amount_paid REAL DEFAULT 0,
            month_value REAL DEFAULT 0,
            estado TEXT DEFAULT 'PENDIENTE',
            rubro TEXT,
            method TEXT,
            receipt TEXT,
            due_date TEXT,
            balance REAL DEFAULT 0,
            delay_days INTEGER DEFAULT 0,
            info TEXT DEFAULT ''
        );

        CREATE TABLE reconciliations (
            id SERIAL PRIMARY KEY,
            date TEXT,
            payment_count INTEGER DEFAULT 0,
            rubro TEXT,
            cash_total REAL DEFAULT 0,
            transfer_total REAL DEFAULT 0,
            grand_total REAL DEFAULT 0
        );

        CREATE TABLE staff_payments (
            id SERIAL PRIMARY KEY,
            date TEXT,
            recipient TEXT,
            amount REAL DEFAULT 0,
            academy TEXT
        );

        CREATE TABLE monthly_summary (
            id SERIAL PRIMARY KEY,
            rubro TEXT,
            month TEXT,
            total REAL DEFAULT 0
        );
      `);
    } else {
      console.log('🗑️ Eliminando tablas en SQLite...');
      await db.exec(`
        DROP TABLE IF EXISTS monthly_summary;
        DROP TABLE IF EXISTS staff_payments;
        DROP TABLE IF EXISTS reconciliations;
        DROP TABLE IF EXISTS payments;
        DROP TABLE IF EXISTS monthly_status;
        DROP TABLE IF EXISTS students;
      `);

      console.log('🏗️ Reconstruyendo tablas en SQLite...');
      await db.exec(`
        CREATE TABLE students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            category TEXT,
            group_name TEXT,
            gender TEXT,
            team TEXT,
            status TEXT DEFAULT 'ACTIVE',
            notes TEXT DEFAULT '',
            monthly_quota REAL DEFAULT 0,
            phone TEXT,
            enrollment_date TEXT DEFAULT '2026-02-01'
        );

        CREATE TABLE monthly_status (
            student_id INTEGER,
            year TEXT,
            month TEXT,
            status TEXT,
            PRIMARY KEY (student_id, year, month),
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        );

        CREATE TABLE payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            payment_date TEXT,
            month_covered TEXT,
            amount_paid REAL DEFAULT 0,
            month_value REAL DEFAULT 0,
            estado TEXT DEFAULT 'PENDIENTE',
            rubro TEXT,
            method TEXT,
            receipt TEXT,
            due_date TEXT,
            balance REAL DEFAULT 0,
            delay_days INTEGER DEFAULT 0,
            info TEXT DEFAULT '',
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        );

        CREATE TABLE reconciliations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            payment_count INTEGER DEFAULT 0,
            rubro TEXT,
            cash_total REAL DEFAULT 0,
            transfer_total REAL DEFAULT 0,
            grand_total REAL DEFAULT 0
        );

        CREATE TABLE staff_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            recipient TEXT,
            amount REAL DEFAULT 0,
            academy TEXT
        );

        CREATE TABLE monthly_summary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rubro TEXT,
            month TEXT,
            total REAL DEFAULT 0
        );
      `);
    }
    
    console.log('✅ Base de datos reseteada y reconstruida correctamente.');
  } catch (error) {
    console.error('❌ Error durante el reinicio:', error);
  } finally {
    process.exit(0);
  }
}

resetAndRebuildDb();
