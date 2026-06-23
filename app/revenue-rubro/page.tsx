import { getDb } from '@/lib/db';
import RevenueRubroUI from '@/components/RevenueRubroUI';

export const dynamic = 'force-dynamic';

export default async function RevenueRubroPage({ searchParams }: { searchParams: Promise<{ rubro?: string }> }) {
  const db = await getDb();
  const resolvedParams = await searchParams;
  const selectedRubro = resolvedParams.rubro || 'ALL';

  // 1. Fetch distinct rubros for the selector dropdown
  const rubros = await db.all("SELECT DISTINCT rubro FROM payments WHERE rubro != '' ORDER BY rubro");

  // 2. Fetch payments filtered by rubro if selected, otherwise all payments
  let query = `
    SELECT 
      p.id, p.student_id, s.name as student_name, s.category,
      p.payment_date, p.month_covered, p.amount_paid, p.month_value,
      p.estado, p.rubro, p.method, p.receipt, p.balance, p.delay_days, p.info
    FROM payments p
    LEFT JOIN students s ON p.student_id = s.id
  `;
  const params: any[] = [];

  if (selectedRubro !== 'ALL') {
    query += ` WHERE p.rubro = ?`;
    params.push(selectedRubro);
  }

  query += ` ORDER BY p.payment_date DESC, p.id DESC`;

  const payments = await db.all(query, params);

  // 3. Stats for this rubro (or all)
  let statsQuery = `
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(amount_paid), 0) as total,
      COALESCE(SUM(CASE WHEN UPPER(method) = 'EFECTIVO' THEN amount_paid ELSE 0 END), 0) as total_efectivo,
      COALESCE(SUM(CASE WHEN UPPER(method) IN ('MP - TRANSFERENCIA', 'TRANSFERENCIA', 'MP') THEN amount_paid ELSE 0 END), 0) as total_digital
    FROM payments
  `;
  const statsParams: any[] = [];

  if (selectedRubro !== 'ALL') {
    statsQuery += ` WHERE rubro = ?`;
    statsParams.push(selectedRubro);
  }

  const stats = await db.get(statsQuery, statsParams);

  return (
    <RevenueRubroUI
      selectedRubro={selectedRubro}
      rubros={rubros.map((r: any) => r.rubro)}
      payments={payments}
      stats={stats}
    />
  );
}
