import { getDb } from '@/lib/db';
import PagosAdministracionUI from '@/components/PagosAdministracionUI';

export const dynamic = 'force-dynamic';

export default async function PagosAdministracionPage() {
  const db = await getDb();

  // Fetch all administration payments (where student_id is null)
  const payments = await db.all(`
    SELECT id, payment_date, amount_paid, rubro, method, receipt, info
    FROM payments
    WHERE student_id IS NULL
    ORDER BY payment_date DESC, id DESC
  `);

  // Unique rubros and methods for filter dropdowns (admin specific)
  const rubros = await db.all("SELECT DISTINCT rubro FROM payments WHERE student_id IS NULL AND rubro != '' ORDER BY rubro");
  const methods = await db.all("SELECT DISTINCT method FROM payments WHERE student_id IS NULL AND method != '' ORDER BY method");

  return (
    <PagosAdministracionUI
      payments={payments}
      rubros={rubros.map((r: { rubro: string }) => r.rubro)}
      methods={methods.map((m: { method: string }) => m.method)}
    />
  );
}
