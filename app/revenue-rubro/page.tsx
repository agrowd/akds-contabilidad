import { getDb } from '@/lib/db';
import RevenueRubroUI from '@/components/RevenueRubroUI';

export const dynamic = 'force-dynamic';

export default async function RevenueRubroPage({ searchParams }: { searchParams: Promise<{ rubro?: string }> }) {
  const db = await getDb();
  const resolvedParams = await searchParams;
  const selectedRubro = resolvedParams.rubro || 'ALL';

  // 1. Fetch distinct rubros from BOTH payments and student_extra_charges
  const rubrosFromPayments = await db.all("SELECT DISTINCT UPPER(TRIM(rubro)) as rubro FROM payments WHERE rubro IS NOT NULL AND TRIM(rubro) != ''");
  const rubrosFromExtra = await db.all("SELECT DISTINCT UPPER(TRIM(rubro)) as rubro FROM student_extra_charges WHERE rubro IS NOT NULL AND TRIM(rubro) != ''");

  const rubrosSet = new Set<string>();
  rubrosFromPayments.forEach((r: any) => { if (r.rubro) rubrosSet.add(r.rubro); });
  rubrosFromExtra.forEach((r: any) => { if (r.rubro) rubrosSet.add(r.rubro); });
  const rubros = Array.from(rubrosSet).sort();

  // 2. Fetch registered payments
  let paymentQuery = `
    SELECT 
      p.id, p.student_id, s.name as student_name, s.category,
      p.payment_date, p.month_covered, p.amount_paid, p.month_value,
      p.estado, p.rubro, p.method, p.receipt, p.balance, p.delay_days, p.info
    FROM payments p
    LEFT JOIN students s ON p.student_id = s.id
  `;
  const paymentParams: any[] = [];
  if (selectedRubro !== 'ALL') {
    paymentQuery += ` WHERE UPPER(TRIM(p.rubro)) = UPPER(TRIM(?))`;
    paymentParams.push(selectedRubro);
  }
  paymentQuery += ` ORDER BY p.payment_date DESC, p.id DESC`;
  const payments = await db.all(paymentQuery, paymentParams);

  // 3. Fetch pending/unpaid extra charges for the rubro
  let extraChargesQuery = `
    SELECT 
      ec.id, ec.student_id, ec.rubro, ec.item_name, ec.amount, ec.due_date, ec.status, ec.notes,
      s.name as student_name, s.category
    FROM student_extra_charges ec
    LEFT JOIN students s ON ec.student_id = s.id
    WHERE ec.status != 'PAID'
  `;
  const extraParams: any[] = [];
  if (selectedRubro !== 'ALL') {
    extraChargesQuery += ` AND UPPER(TRIM(ec.rubro)) = UPPER(TRIM(?))`;
    extraParams.push(selectedRubro);
  }
  extraChargesQuery += ` ORDER BY ec.due_date DESC, ec.id DESC`;
  const pendingExtraCharges = await db.all(extraChargesQuery, extraParams);

  // 4. Calculate total stats for paid payments
  let totalPaymentsQuery = `SELECT COALESCE(SUM(amount_paid), 0) as total, COUNT(*) as count FROM payments`;
  const totalParams: any[] = [];
  if (selectedRubro !== 'ALL') {
    totalPaymentsQuery += ` WHERE UPPER(TRIM(rubro)) = UPPER(TRIM(?))`;
    totalParams.push(selectedRubro);
  }
  const paymentStats = await db.get(totalPaymentsQuery, totalParams);

  // 5. Calculate total stats for pending extra charges
  let totalPendingQuery = `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM student_extra_charges WHERE status != 'PAID'`;
  const pendingParams: any[] = [];
  if (selectedRubro !== 'ALL') {
    totalPendingQuery += ` AND UPPER(TRIM(rubro)) = UPPER(TRIM(?))`;
    pendingParams.push(selectedRubro);
  }
  const pendingStats = await db.get(totalPendingQuery, pendingParams);

  return (
    <RevenueRubroUI
      selectedRubro={selectedRubro}
      rubros={rubros}
      payments={payments.map((p: any) => ({ ...p, id: Number(p.id), student_id: p.student_id ? Number(p.student_id) : null }))}
      pendingExtraCharges={pendingExtraCharges.map((ec: any) => ({ ...ec, id: Number(ec.id), student_id: Number(ec.student_id) }))}
      stats={{
        total_paid: Number(paymentStats?.total || 0),
        count_paid: Number(paymentStats?.count || 0),
        total_pending: Number(pendingStats?.total || 0),
        count_pending: Number(pendingStats?.count || 0),
      }}
    />
  );
}
