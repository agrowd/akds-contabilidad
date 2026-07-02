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
    SELECT ec.id, ec.student_id, ec.rubro, ec.item_name, ec.amount, ec.due_date, ec.status, ec.notes,
           p.method as payment_method
    FROM student_extra_charges ec
    LEFT JOIN payments p ON p.receipt = 'CE-' || CAST(ec.id AS TEXT) AND p.student_id = ec.student_id
    ORDER BY ec.due_date DESC, ec.id DESC
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
