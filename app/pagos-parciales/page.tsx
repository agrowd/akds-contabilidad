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

  // Extra charges that are unpaid (status = 'UNPAID')
  const extraCharges = await db.all(`
    SELECT ec.id, ec.student_id, ec.rubro, ec.item_name, ec.amount, ec.due_date, ec.status, ec.notes,
           s.name as student_name, s.category as student_category, s.status as student_status
    FROM student_extra_charges ec
    JOIN students s ON ec.student_id = s.id
    WHERE ec.status = 'UNPAID'
    ORDER BY ec.due_date DESC, ec.id DESC
  `);

  // Payment history for all students (to check all payments)
  const payments = await db.all(`
    SELECT id, student_id, payment_date, month_covered, amount_paid, month_value,
           estado, rubro, method, receipt, balance, delay_days, info
    FROM payments
    ORDER BY payment_date DESC
  `);

  // Group payments by student ID (casting to Number to avoid Postgres string keys)
  const paymentsByStudent: Record<number, any[]> = {};
  payments.forEach((p: any) => {
    if (p.student_id === null) return;
    const studentId = Number(p.student_id);
    if (!paymentsByStudent[studentId]) paymentsByStudent[studentId] = [];
    paymentsByStudent[studentId].push(p);
  });

  return (
    <PagosParcialesUI
      students={students.map((s: any) => ({ ...s, id: Number(s.id) }))}
      partialStatuses={partialStatuses.map((ps: any) => ({ ...ps, student_id: Number(ps.student_id) }))}
      paymentsByStudent={paymentsByStudent}
      extraCharges={extraCharges.map((ec: any) => ({ ...ec, student_id: Number(ec.student_id), id: Number(ec.id) }))}
    />
  );
}
