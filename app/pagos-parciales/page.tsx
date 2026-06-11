import { getDb } from '@/lib/db';
import PagosParcialesUI from '@/components/PagosParcialesUI';

export const dynamic = 'force-dynamic';

export default async function PagosParcialesPage() {
  const db = await getDb();
  const currentYear = new Date().getFullYear().toString();

  // All students
  const students = await db.all(`
    SELECT id, name, category, monthly_quota, status 
    FROM students 
    ORDER BY name
  `);

  // Monthly statuses for current year in PARTIAL state
  const partialStatuses = await db.all(`
    SELECT student_id, month, year, status 
    FROM monthly_status 
    WHERE status = 'PARTIAL' AND year = ?
  `, [currentYear]);

  // Payment history for all students for current year
  const payments = await db.all(`
    SELECT id, student_id, payment_date, month_covered, amount_paid, month_value,
           estado, rubro, method, receipt, balance, delay_days, info
    FROM payments
    WHERE month_covered LIKE ?
    ORDER BY payment_date DESC
  `, [`${currentYear}%`]);

  // Group payments by student ID
  const paymentsByStudent: Record<number, any[]> = {};
  payments.forEach((p: any) => {
    if (!paymentsByStudent[p.student_id]) paymentsByStudent[p.student_id] = [];
    paymentsByStudent[p.student_id].push(p);
  });

  return (
    <PagosParcialesUI
      students={students}
      partialStatuses={partialStatuses}
      paymentsByStudent={paymentsByStudent}
    />
  );
}
