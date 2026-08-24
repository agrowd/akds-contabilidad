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

  // 3. Fetch all payments linked to extra charges to compute true remaining balances
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

  // 4. Fetch pending/unpaid extra charges for the rubro
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
  const rawPendingExtraCharges = await db.all(extraChargesQuery, extraParams);

  const pendingExtraCharges = rawPendingExtraCharges.map((ec: any) => {
    const cid = Number(ec.id);
    const paidForThis = cePaidByChargeId[cid] || 0;
    const amount = Number(ec.amount || 0);
    const remaining = Math.max(0, amount - paidForThis);
    return {
      ...ec,
      id: cid,
      student_id: Number(ec.student_id),
      amount: remaining,
      original_amount: amount,
      paid_amount: paidForThis
    };
  }).filter((ec: any) => ec.amount > 0);

  // 5. Calculate total stats for paid payments
  let totalPaymentsQuery = `SELECT COALESCE(SUM(amount_paid), 0) as total, COUNT(*) as count FROM payments`;
  const totalParams: any[] = [];
  if (selectedRubro !== 'ALL') {
    totalPaymentsQuery += ` WHERE UPPER(TRIM(rubro)) = UPPER(TRIM(?))`;
    totalParams.push(selectedRubro);
  }
  const paymentStats = await db.get(totalPaymentsQuery, totalParams);

  const totalPendingAmount = pendingExtraCharges.reduce((sum: number, ec: any) => sum + ec.amount, 0);

  return (
    <RevenueRubroUI
      selectedRubro={selectedRubro}
      rubros={rubros}
      payments={payments.map((p: any) => ({ ...p, id: Number(p.id), student_id: p.student_id ? Number(p.student_id) : null }))}
      pendingExtraCharges={pendingExtraCharges}
      stats={{
        total_paid: Number(paymentStats?.total || 0),
        count_paid: Number(paymentStats?.count || 0),
        total_pending: totalPendingAmount,
        count_pending: pendingExtraCharges.length,
      }}
    />
  );
}
