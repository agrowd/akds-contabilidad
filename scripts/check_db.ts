import { getDb } from '../lib/db';

async function check() {
    const db = await getDb();
    const students = await db.all("SELECT * FROM students WHERE name = 'TEST STUDENT'");
    console.log(JSON.stringify(students, null, 2));
    process.exit(0);
}

check();
