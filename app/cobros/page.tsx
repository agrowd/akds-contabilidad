import { getDb } from '@/lib/db';
import CobrosUI from '@/components/CobrosUI';

export const dynamic = 'force-dynamic';

export default async function CobrosPage() {
  const db = await getDb();

  // All payments with student name
  const payments = await db.all(`
    SELECT 
      p.id, p.student_id, s.name as student_name, s.category,
      p.payment_date, p.month_covered, p.amount_paid, p.month_value,
      p.estado, p.rubro, p.method, p.receipt, p.balance, p.delay_days, p.info
    FROM payments p
    JOIN students s ON p.student_id = s.id
    ORDER BY p.payment_date DESC, p.id DESC
  `);

  // Stats
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_payments,
      COALESCE(SUM(amount_paid), 0) as total_amount,
      COALESCE(SUM(CASE WHEN estado = 'ABONADA' THEN amount_paid ELSE 0 END), 0) as total_abonada,
      COALESCE(SUM(CASE WHEN estado = 'PENDIENTE' THEN amount_paid ELSE 0 END), 0) as total_pendiente,
      COALESCE(SUM(balance), 0) as total_balance
    FROM payments
  `);

  // Monthly summary (from the Excel's right-side table)
  const monthlySummary = await db.all(`
    SELECT rubro, month, total
    FROM monthly_summary
    ORDER BY rubro, 
      CASE month
        WHEN 'ENERO' THEN 1 WHEN 'FEBRERO' THEN 2 WHEN 'MARZO' THEN 3
        WHEN 'ABRIL' THEN 4 WHEN 'MAYO' THEN 5 WHEN 'JUNIO' THEN 6
        WHEN 'JULIO' THEN 7 WHEN 'AGOSTO' THEN 8 WHEN 'SEPTIEMBRE' THEN 9
        WHEN 'OCTUBRE' THEN 10 WHEN 'NOVIEMBRE' THEN 11 WHEN 'DICIEMBRE' THEN 12
      END
  `);

  // Unique rubros and methods for filters
  const rubros = await db.all("SELECT DISTINCT rubro FROM payments WHERE rubro != '' ORDER BY rubro");
  const methods = await db.all("SELECT DISTINCT method FROM payments WHERE method != '' ORDER BY method");

  return (
    <CobrosUI
      payments={payments}
      stats={stats}
      monthlySummary={monthlySummary}
      rubros={rubros.map((r: { rubro: string }) => r.rubro)}
      methods={methods.map((m: { method: string }) => m.method)}
    />
  );
}
