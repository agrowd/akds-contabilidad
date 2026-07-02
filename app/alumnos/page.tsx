import { getDb } from '@/lib/db';
import AlumnosUI from '@/components/AlumnosUI';

export const dynamic = 'force-dynamic';

export default async function AlumnosPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const db = await getDb();
  const currentYear = new Date().getFullYear().toString();
  const resolvedParams = await searchParams;
  const selectedId = resolvedParams.id ? parseInt(resolvedParams.id) : undefined;

  // All students with their payment summary
  const students = await db.all(`
    SELECT 
      s.id, s.name, s.category, s.group_name, s.gender, s.team, s.status, s.notes, s.monthly_quota, s.phone, s.enrollment_date, s.period_end_date,
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
  const statuses = await db.all('SELECT student_id, month, status, disabled_reason FROM monthly_status WHERE year = ?', [currentYear]);
  const statusMap: Record<number, Record<string, string>> = {};
  const disabledReasonsMap: Record<number, Record<string, string>> = {};
  statuses.forEach((s: { student_id: number; month: string; status: string; disabled_reason?: string }) => {
    const studentId = Number(s.student_id);
    if (!statusMap[studentId]) statusMap[studentId] = {};
    statusMap[studentId][s.month] = s.status;
    if (s.disabled_reason) {
      if (!disabledReasonsMap[studentId]) disabledReasonsMap[studentId] = {};
      disabledReasonsMap[studentId][s.month] = s.disabled_reason;
    }
  });

  // Payment history for all students
  const payments = await db.all(`
    SELECT id, student_id, payment_date, month_covered, amount_paid, month_value,
           estado, rubro, method, receipt, balance, delay_days, info
    FROM payments
    ORDER BY payment_date DESC
  `);

  const paymentsByStudent: Record<number, typeof payments> = {};
  payments.forEach((p: { student_id: number | null }) => {
    if (p.student_id === null) return;
    const studentId = Number(p.student_id);
    if (!paymentsByStudent[studentId]) paymentsByStudent[studentId] = [];
    paymentsByStudent[studentId].push(p as any);
  });

  // Categories for filter
  const categories = await db.all('SELECT DISTINCT category FROM students ORDER BY category');

  // Clothing catalog
  const catalogItems = await db.all('SELECT * FROM clothing_catalog ORDER BY name');

  // Student extra charges
  const extraCharges = await db.all(`
    SELECT ec.id, ec.student_id, ec.rubro, ec.item_name, ec.amount, ec.due_date, ec.status, ec.notes,
           p.method as payment_method
    FROM student_extra_charges ec
    LEFT JOIN payments p ON p.receipt = 'CE-' || CAST(ec.id AS TEXT) AND p.student_id = ec.student_id
    ORDER BY ec.due_date DESC, ec.id DESC
  `);
  const extraChargesByStudent: Record<number, any[]> = {};
  extraCharges.forEach((ec: { student_id: number }) => {
    const studentId = Number(ec.student_id);
    if (!extraChargesByStudent[studentId]) extraChargesByStudent[studentId] = [];
    extraChargesByStudent[studentId].push(ec);
  });

  return (
    <AlumnosUI
      students={students.map((s: any) => ({ ...s, id: Number(s.id) }))}
      statusMap={statusMap}
      disabledReasonsMap={disabledReasonsMap}
      paymentsByStudent={paymentsByStudent}
      categories={categories.map((c: { category: string }) => c.category)}
      catalogItems={catalogItems}
      extraChargesByStudent={extraChargesByStudent}
      initialSelectedStudentId={selectedId}
    />
  );
}
