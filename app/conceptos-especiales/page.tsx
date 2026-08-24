import { getDb } from '@/lib/db';
import ConceptosEspecialesUI from '@/components/ConceptosEspecialesUI';

export const dynamic = 'force-dynamic';

export default async function ConceptosEspecialesPage() {
  const db = await getDb();

  // All students with basic info
  const rawStudents = await db.all(`
    SELECT id, name, category, status, monthly_quota, phone, enrollment_date, period_end_date
    FROM students
    ORDER BY name
  `);
  const students = rawStudents.map((s: any) => ({ ...s, id: Number(s.id) }));

  // Global clothing catalog
  const catalogItems = await db.all(`
    SELECT id, name, price 
    FROM clothing_catalog 
    ORDER BY name
  `);

  // Extra charges assigned to all students
  const rawExtraCharges = await db.all(`
    SELECT id, student_id, rubro, item_name, amount, due_date, status, notes
    FROM student_extra_charges
    ORDER BY due_date DESC, id DESC
  `);

  // Payments linked to special concepts
  const cePayments = await db.all(`
    SELECT id, student_id, payment_date, month_covered, amount_paid, month_value,
           estado, rubro, method, receipt, due_date, balance, delay_days, info
    FROM payments
    WHERE receipt LIKE 'CE-%'
    ORDER BY payment_date DESC, id DESC
  `);

  // Group payments by charge_id (parsed from receipt 'CE-123')
  const paymentsByCharge: Record<number, any[]> = {};
  cePayments.forEach((p: any) => {
    if (p.receipt && p.receipt.startsWith('CE-')) {
      const chargeIdStr = p.receipt.substring(3).trim();
      const chargeId = parseInt(chargeIdStr, 10);
      if (!isNaN(chargeId)) {
        if (!paymentsByCharge[chargeId]) paymentsByCharge[chargeId] = [];
        paymentsByCharge[chargeId].push({
          ...p,
          id: Number(p.id),
          student_id: Number(p.student_id),
          amount_paid: Number(p.amount_paid)
        });
      }
    }
  });

  const extraChargesByStudent: Record<number, any[]> = {};
  rawExtraCharges.forEach((ec: any) => {
    const chargeId = Number(ec.id);
    const studentId = Number(ec.student_id);
    const chargePayments = paymentsByCharge[chargeId] || [];
    const totalPaid = chargePayments.reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0);
    const amount = Number(ec.amount || 0);
    const remainingBalance = Math.max(0, amount - totalPaid);
    const isPaid = totalPaid >= amount && amount > 0;
    const isPartial = totalPaid > 0 && totalPaid < amount;
    const computedStatus = isPaid ? 'PAID' : (isPartial ? 'PARTIAL' : (ec.status === 'PAID' ? 'PAID' : 'UNPAID'));

    if (!extraChargesByStudent[studentId]) {
      extraChargesByStudent[studentId] = [];
    }
    extraChargesByStudent[studentId].push({
      ...ec,
      id: chargeId,
      student_id: studentId,
      amount: amount,
      total_paid: totalPaid,
      remaining_balance: remainingBalance,
      movements: chargePayments,
      movements_count: chargePayments.length,
      status: computedStatus,
      payment_method: chargePayments.length > 0 ? chargePayments[0].method : undefined
    });
  });

  return (
    <ConceptosEspecialesUI
      students={students}
      catalogItems={catalogItems}
      extraChargesByStudent={extraChargesByStudent}
    />
  );
}
