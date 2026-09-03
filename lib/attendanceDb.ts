import { createPool, VercelPool } from '@vercel/postgres';

let attendancePool: VercelPool | null = null;

const ATTENDANCE_CONN =
  process.env.ACADEMIA_DATABASE_URL ||
  "postgresql://neondb_owner:npg_ZyfgEdh24zJT@ep-shiny-truth-aqqs1g7y-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30";

export function getAttendancePool(): VercelPool {
  if (!attendancePool) {
    attendancePool = createPool({
      connectionString: ATTENDANCE_CONN,
    });
  }
  return attendancePool;
}

export interface AttendanceRecordItem {
  id: string;
  date: string; // ISO string
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  student_id: string;
  student_name: string;
  category: number;
  turno: string;
  teacher_id: string;
  teacher_name: string;
}

export interface AttendanceTeacherItem {
  id: string;
  name: string;
  username: string;
  role: string;
}

export interface AttendanceStudentItem {
  id: string;
  name: string;
  category: number;
  turno: string;
  teacher_id: string;
  teacher_name: string;
}

export async function fetchAttendanceData() {
  const pool = getAttendancePool();

  const [attRes, teachersRes, studentsRes] = await Promise.all([
    pool.query(`
      SELECT 
        a.id,
        a.date,
        a.status,
        s.id as student_id,
        s.name as student_name,
        s.category,
        s.turno,
        t.id as teacher_id,
        t.name as teacher_name
      FROM "Attendance" a
      JOIN "Student" s ON a."studentId" = s.id
      JOIN "Teacher" t ON s."teacherId" = t.id
      ORDER BY a.date DESC, s.name ASC
    `),
    pool.query(`
      SELECT id, name, username, role
      FROM "Teacher"
      ORDER BY name ASC
    `),
    pool.query(`
      SELECT 
        s.id,
        s.name,
        s.category,
        s.turno,
        t.id as teacher_id,
        t.name as teacher_name
      FROM "Student" s
      JOIN "Teacher" t ON s."teacherId" = t.id
      ORDER BY s.name ASC
    `),
  ]);

  const records: AttendanceRecordItem[] = attRes.rows.map((row) => ({
    id: row.id,
    date: row.date instanceof Date ? row.date.toISOString() : String(row.date),
    status: row.status as 'PRESENT' | 'ABSENT' | 'LATE',
    student_id: row.student_id,
    student_name: row.student_name,
    category: Number(row.category),
    turno: row.turno,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name,
  }));

  const teachers: AttendanceTeacherItem[] = teachersRes.rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
  }));

  const students: AttendanceStudentItem[] = studentsRes.rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: Number(row.category),
    turno: row.turno,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name,
  }));

  return {
    records,
    teachers,
    students,
  };
}
