import { getDb } from '@/lib/db';
import AlumnosUI from '@/components/AlumnosUI';

export const dynamic = 'force-dynamic';

export default async function AlumnosPage() {
  const db = await getDb();
  const currentYear = new Date().getFullYear().toString();

  // All students with their payment summary
  const students = await db.all(`
    SELECT 
      s.id, s.name, s.category, s.group_name, s.gender, s.team, s.status, s.notes, s.monthly_quota, s.phone, s.enrollment_date,
      (SELECT COUNT(*) FROM payments p WHERE p.student_id = s.id AND p.payment_date LIKE ?) as payment_count,
      (SELECT COALESCE(SUM(p.amount_paid), 0) FROM payments p WHERE p.student_id = s.id AND p.payment_date LIKE ?) as total_paid,
      (SELECT COALESCE(SUM(p.balance), 0) FROM payments p WHERE p.student_id = s.id AND p.payment_date LIKE ?) as total_balance,
      (SELECT COUNT(CASE WHEN ms.status = 'PAID' THEN 1 END) FROM monthly_status ms WHERE ms.student_id = s.id AND ms.year = ?) as months_paid,
      (SELECT COUNT(CASE WHEN ms.status = 'UNPAID' THEN 1 END) FROM monthly_status ms WHERE ms.student_id = s.id AND ms.year = ?) as months_unpaid,
      (SELECT COUNT(CASE WHEN ms.status = 'PARTIAL' THEN 1 END) FROM monthly_status ms WHERE ms.student_id = s.id AND ms.year = ?) as months_partial
    FROM students s
    ORDER BY s.category, s.name
  `, [`${currentYear}%`, `${currentYear}%`, `${currentYear}%`, currentYear, currentYear, currentYear]);

  // Monthly statuses for all students in the current year
  const statuses = await db.all('SELECT student_id, month, status FROM monthly_status WHERE year = ?', [currentYear]);
  const statusMap: Record<number, Record<string, string>> = {};
  statuses.forEach((s: { student_id: number; month: string; status: string }) => {
    if (!statusMap[s.student_id]) statusMap[s.student_id] = {};
    statusMap[s.student_id][s.month] = s.status;
  });

  // Payment history for all students
  const payments = await db.all(`
    SELECT id, student_id, payment_date, month_covered, amount_paid, month_value,
           estado, rubro, method, receipt, balance, delay_days, info
    FROM payments
    ORDER BY payment_date DESC
  `);

  const paymentsByStudent: Record<number, typeof payments> = {};
  payments.forEach((p: { student_id: number }) => {
    if (!paymentsByStudent[p.student_id]) paymentsByStudent[p.student_id] = [];
    paymentsByStudent[p.student_id].push(p);
  });

  // Categories for filter
  const categories = await db.all('SELECT DISTINCT category FROM students ORDER BY category');

  return (
    <AlumnosUI
      students={students}
      statusMap={statusMap}
      paymentsByStudent={paymentsByStudent}
      categories={categories.map((c: { category: string }) => c.category)}
    />
  );
}
