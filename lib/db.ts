import { createPool, VercelPool } from '@vercel/postgres';
import path from 'path';

let sqliteDb: any = null;
let postgresPool: VercelPool | null = null;

const isProd = !!process.env.POSTGRES_URL;

export async function getDb() {
  if (isProd) {
    if (!postgresPool) {
      postgresPool = createPool({
        connectionString: process.env.POSTGRES_URL
      });
    }
    return {
      all: async (sql: string, params: any[] = []) => {
        const pSql = convertSql(sql);
        const { rows } = await postgresPool!.query(pSql, params);
        return rows;
      },
      get: async (sql: string, params: any[] = []) => {
        const pSql = convertSql(sql);
        const { rows } = await postgresPool!.query(pSql, params);
        return rows[0];
      },
      run: async (sql: string, params: any[] = []) => {
        let pSql = convertSql(sql);
        if (pSql.trim().toUpperCase().startsWith('INSERT')) {
            pSql += ' RETURNING id';
            const result = await postgresPool!.query(pSql, params);
            return { lastID: result.rows[0]?.id };
        } else {
            await postgresPool!.query(pSql, params);
            return { lastID: null };
        }
      },
      exec: async (sql: string) => {
        await postgresPool!.query(sql);
      }
    };
  } else {
    if (!sqliteDb) {
      // Use eval to completely bypass static analysis during Vercel build
      const sqlite3 = (await eval('import("sqlite3")')).default;
      const { open } = await eval('import("sqlite")');
      
      const dbPath = path.resolve(process.cwd(), 'akds.sqlite');
      sqliteDb = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
    }
    return sqliteDb;
  }
}

function convertSql(sql: string) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}
