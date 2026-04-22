import { getDb } from '@/lib/db';
import RendicionUI from '@/components/RendicionUI';

export const dynamic = 'force-dynamic';

export default async function RendicionPage() {
  const db = await getDb();

  // All reconciliations with cobrado comparison
  const reconciliations = await db.all(`
    SELECT 
      r.id, r.date, r.payment_count, r.rubro, 
      r.cash_total, r.transfer_total, r.grand_total,
      (SELECT COALESCE(SUM(p.amount_paid), 0) FROM payments p WHERE p.payment_date = r.date AND p.rubro = r.rubro) as cobrado
    FROM reconciliations r
    ORDER BY r.date DESC
  `);

  // Stats
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_records,
      COALESCE(SUM(grand_total), 0) as total_rendido,
      COALESCE(SUM(cash_total), 0) as total_cash,
      COALESCE(SUM(transfer_total), 0) as total_transfer
    FROM reconciliations
  `);

  // Staff payments
  const staffPayments = await db.all(`
    SELECT id, date, recipient, amount, academy
    FROM staff_payments
    ORDER BY date DESC
  `);

  // Staff stats
  const staffStats = await db.get(`
    SELECT 
      COUNT(*) as total_payments,
      COALESCE(SUM(amount), 0) as total_amount
    FROM staff_payments
  `);

  return (
    <RendicionUI
      reconciliations={reconciliations}
      stats={stats}
      staffPayments={staffPayments}
      staffStats={staffStats}
    />
  );
}
