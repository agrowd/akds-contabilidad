import { getDb } from '@/lib/db';
import DashboardUI from '@/components/DashboardUI';

export default async function DashboardPage() {
  const db = await getDb();

  // 1. GLOBAL STATS
  const stats = await db.get(`
    SELECT 
      (SELECT COUNT(*) FROM students) as total_students,
      (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) as total_revenue,
      (SELECT COUNT(*) FROM payments) as total_txs,
      (SELECT COALESCE(SUM(grand_total), 0) FROM reconciliations) as total_reconciled
  `);

  // 2. CATEGORIES
  const categories = await db.all(
    'SELECT category, COUNT(*) as count FROM students GROUP BY category ORDER BY count DESC'
  );

  // 3. ALL STUDENTS (for matrix)
  const students = await db.all(`
    SELECT id, name, category, group_name
    FROM students
    WHERE category IN ('INFANTIL', 'ESCUELA SD')
    ORDER BY category, name
  `);

  // 4. MONTHLY STATUSES
  const studentIds = students.map(s => s.id);
  let statuses: { student_id: number; month: string; status: string }[] = [];
  if (studentIds.length > 0) {
    statuses = await db.all(`
      SELECT student_id, month, status FROM monthly_status
      WHERE student_id IN (${studentIds.join(',')})
    `);
  }

  const statusMap: Record<number, Record<string, string>> = {};
  statuses.forEach(s => {
    if (!statusMap[s.student_id]) statusMap[s.student_id] = {};
    statusMap[s.student_id][s.month] = s.status;
  });

  // 5. RECONCILIATION COMPARISON
  const reconciliations = await db.all(`
    SELECT r.date, r.grand_total as rendido, r.rubro,
           (SELECT COALESCE(SUM(amount_paid), 0) FROM payments p WHERE p.payment_date = r.date) as cobrado
    FROM reconciliations r
    ORDER BY r.date DESC
    LIMIT 15
  `);

  // 6. TOP DEBTORS (students with most unpaid months)
  const debtors = await db.all(`
    SELECT s.id, s.name, s.category,
           COUNT(CASE WHEN ms.status = 'UNPAID' THEN 1 END) as unpaid_months,
           COUNT(CASE WHEN ms.status = 'PAID' THEN 1 END) as paid_months,
           COALESCE(SUM(CASE WHEN ms.status = 'UNPAID' THEN 1 END), 0) as debt_count
    FROM students s
    LEFT JOIN monthly_status ms ON s.id = ms.student_id
    WHERE s.category IN ('INFANTIL', 'ESCUELA SD')
    GROUP BY s.id
    HAVING unpaid_months > 0
    ORDER BY unpaid_months DESC
    LIMIT 10
  `);

  // 7. REVENUE BY METHOD
  const revenueByMethod = await db.all(`
    SELECT method, COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
    FROM payments
    WHERE method != ''
    GROUP BY method
  `);

  // 8. REVENUE BY RUBRO
  const revenueByRubro = await db.all(`
    SELECT rubro, COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
    FROM payments
    WHERE rubro != ''
    GROUP BY rubro
    ORDER BY total DESC
  `);

  return (
    <DashboardUI
      stats={stats}
      categories={categories}
      students={students}
      statusMap={statusMap}
      reconciliations={reconciliations}
      debtors={debtors}
      revenueByMethod={revenueByMethod}
      revenueByRubro={revenueByRubro}
    />
  );
}
