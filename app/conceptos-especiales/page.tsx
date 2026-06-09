import { getDb } from '@/lib/db';
import ConceptosEspecialesUI from '@/components/ConceptosEspecialesUI';

export const dynamic = 'force-dynamic';

export default async function ConceptosEspecialesPage() {
  const db = await getDb();

  // All students with basic info
  const students = await db.all(`
    SELECT id, name, category, status, monthly_quota, phone, enrollment_date, period_end_date
    FROM students
    ORDER BY name
  `);

  // Global clothing catalog
  const catalogItems = await db.all(`
    SELECT id, name, price 
    FROM clothing_catalog 
    ORDER BY name
  `);

  // Extra charges assigned to all students
  const extraCharges = await db.all(`
    SELECT id, student_id, rubro, item_name, amount, due_date, status, notes
    FROM student_extra_charges
    ORDER BY due_date DESC, id DESC
  `);

  const extraChargesByStudent: Record<number, typeof extraCharges> = {};
  extraCharges.forEach((ec: any) => {
    if (!extraChargesByStudent[ec.student_id]) {
      extraChargesByStudent[ec.student_id] = [];
    }
    extraChargesByStudent[ec.student_id].push(ec);
  });

  return (
    <ConceptosEspecialesUI
      students={students}
      catalogItems={catalogItems}
      extraChargesByStudent={extraChargesByStudent}
    />
  );
}
