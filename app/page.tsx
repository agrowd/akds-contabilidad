import { getDb } from '@/lib/db';
import DashboardUI from '@/components/DashboardUI';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const db = await getDb();

  // 1. STATS
  const stats = await db.get(`
    SELECT 
      (SELECT COALESCE(SUM(amount_paid), 0) FROM payments) as total_revenue,
      (SELECT COUNT(*) FROM payments) as total_payments,
      (SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE UPPER(method) = 'EFECTIVO') as total_efectivo,
      (SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE UPPER(method) IN ('MP - TRANSFERENCIA', 'TRANSFERENCIA', 'MP')) as total_digital,
      (SELECT COUNT(*) FROM students WHERE status = 'ACTIVE') as total_students
  `);

  // 2. CATEGORIES
  const categories = await db.all(`
    SELECT category, COUNT(*) as count 
    FROM students 
    WHERE status = 'ACTIVE' 
    GROUP BY category
    ORDER BY count DESC
  `);

  // 3. STUDENTS
  const students = await db.all(`
    SELECT s.id, s.name, s.category, s.status, s.enrollment_date, s.period_end_date,
           (SELECT COALESCE(SUM(amount_paid), 0) FROM payments p WHERE p.student_id = s.id) as total_paid
    FROM students s
    ORDER BY s.name
  `);

  // 4. MONTHLY STATUSES
  const studentIds = students.map((s: any) => s.id);
  let statuses: { student_id: number; month: string; status: string }[] = [];
  if (studentIds.length > 0) {
    statuses = await db.all(`
      SELECT student_id, month, status FROM monthly_status
    `);
  }

  const statusMap: Record<number, Record<string, string>> = {};
  statuses.forEach((s: any) => {
    const studentId = Number(s.student_id);
    if (!statusMap[studentId]) statusMap[studentId] = {};
    statusMap[studentId][s.month] = s.status;
  });

  // 5. TOP DEBTORS (dinámico, respetando rango activo de cobro y fecha actual)
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();
  const currentYearStr = new Date().getFullYear().toString();
  const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  const debtors = students.map((s: any) => {
    const studentId = Number(s.id);
    const studentStatus = statusMap[studentId] || {};
    let monthsPaid = 0;
    let monthsUnpaid = 0;
    
    const startYearMonth = s.enrollment_date ? s.enrollment_date.substring(0, 7) : '2026-02';
    const endYearMonth = s.period_end_date ? s.period_end_date.substring(0, 7) : `${currentYearStr}-12`;

    MONTHS.forEach((m, idx) => {
      const targetYearMonth = `${currentYearStr}-${String(idx + 1).padStart(2, '0')}`;
      const inRange = targetYearMonth >= startYearMonth && targetYearMonth <= endYearMonth;
      
      if (inRange) {
        const st = studentStatus[m];
        let displayStatus = st || 'UNPAID';
        
        if (displayStatus === 'UNPAID' && s.status !== 'SUSPENDIDO') {
          if (currentMonth > idx || (currentMonth === idx && currentDay > 10)) {
            displayStatus = 'MOROSO';
          }
        }

        if (displayStatus === 'PAID') {
          monthsPaid++;
        } else if (displayStatus === 'MOROSO') {
          monthsUnpaid++;
        }
      }
    });

    return {
      id: studentId,
      name: s.name,
      category: s.category,
      unpaid_months: monthsUnpaid,
      paid_months: monthsPaid
    };
  })
  .filter((d: any) => d.unpaid_months > 0)
  .sort((a: any, b: any) => b.unpaid_months - a.unpaid_months)
  .slice(0, 10);

  // 6. REVENUE BY METHOD
  const revenueByMethod = await db.all(`
    SELECT method, COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total
    FROM payments
    WHERE method != ''
    GROUP BY method
  `);

  // 7. REVENUE BY RUBRO (combining payments and pending extra charges)
  const rubrosFromPayments = await db.all("SELECT DISTINCT UPPER(TRIM(rubro)) as rubro FROM payments WHERE rubro IS NOT NULL AND TRIM(rubro) != ''");
  const rubrosFromExtra = await db.all("SELECT DISTINCT UPPER(TRIM(rubro)) as rubro FROM student_extra_charges WHERE rubro IS NOT NULL AND TRIM(rubro) != ''");

  const cePayments = await db.all(`SELECT receipt, amount_paid FROM payments WHERE receipt LIKE 'CE-%'`);
  const cePaidByChargeId: Record<number, number> = {};
  cePayments.forEach((p: any) => {
    if (p.receipt && p.receipt.startsWith('CE-')) {
      const cid = parseInt(p.receipt.substring(3), 10);
      if (!isNaN(cid)) {
        cePaidByChargeId[cid] = (cePaidByChargeId[cid] || 0) + Number(p.amount_paid || 0);
      }
    }
  });

  const pendingExtraChargesAll = await db.all("SELECT id, rubro, amount, status FROM student_extra_charges WHERE status != 'PAID'");

  const allRubrosSet = new Set<string>();
  rubrosFromPayments.forEach((r: any) => { if (r.rubro) allRubrosSet.add(r.rubro); });
  rubrosFromExtra.forEach((r: any) => { if (r.rubro) allRubrosSet.add(r.rubro); });

  const revenueByRubroList = [];
  for (const rubroName of Array.from(allRubrosSet)) {
    const pStat = await db.get(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE UPPER(TRIM(rubro)) = UPPER(TRIM(?))",
      [rubroName]
    );

    const matchingPending = pendingExtraChargesAll.filter((ec: any) => 
      (ec.rubro || '').toUpperCase().trim() === rubroName.toUpperCase().trim()
    );

    let totalPending = 0;
    matchingPending.forEach((ec: any) => {
      const cid = Number(ec.id);
      const paid = cePaidByChargeId[cid] || 0;
      const rem = Math.max(0, Number(ec.amount || 0) - paid);
      totalPending += rem;
    });

    const countPaid = Number(pStat?.count || 0);
    const totalPaid = Number(pStat?.total || 0);
    const countPending = matchingPending.filter((ec: any) => {
      const cid = Number(ec.id);
      const paid = cePaidByChargeId[cid] || 0;
      return Number(ec.amount || 0) - paid > 0;
    }).length;

    revenueByRubroList.push({
      rubro: rubroName,
      count: countPaid + countPending,
      total: totalPaid,
      total_pending: totalPending
    });
  }

  revenueByRubroList.sort((a, b) => (b.total + b.total_pending) - (a.total + a.total_pending));

  return (
    <DashboardUI
      stats={stats}
      categories={categories}
      students={students}
      statusMap={statusMap}
      debtors={debtors}
      revenueByMethod={revenueByMethod}
      revenueByRubro={revenueByRubroList}
    />
  );
}
