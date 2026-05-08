'use server';

import { getDb } from './db';
import { revalidatePath } from 'next/cache';

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

/**
 * Helper to update the monthly_status for a student/month based on actual payments.
 */
async function syncMonthlyStatus(student_id: number, month_covered: string) {
    const db = await getDb();
    const parts = month_covered.split('-'); // e.g. "2026-03" or "2026-03-01"
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const monthName = MONTHS[monthIdx];

    const student = await db.get(`SELECT status FROM students WHERE id = ?`, [student_id]);
    const isSuspended = student?.status === 'SUSPENDIDO';

    // Get all payments for this student and this specific month
    const payments = await db.all(
        `SELECT amount_paid, month_value FROM payments 
         WHERE student_id = ? AND month_covered LIKE ?`,
        [student_id, `${year}-${parts[1]}%`]
    );

    let totalPaid = 0;
    let requiredValue = 0;

    if (payments.length > 0) {
        totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount_paid, 0);
        requiredValue = payments[0].month_value; // Assume same value for the month
    }

    let newStatus = 'UNPAID';
    if (totalPaid >= requiredValue && requiredValue > 0) newStatus = 'PAID';
    else if (totalPaid > 0) newStatus = 'PARTIAL';
    else if (isSuspended) newStatus = 'SUSPENDIDO';

    await db.run(
        `INSERT INTO monthly_status (student_id, year, month, status) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(student_id, year, month) DO UPDATE SET status = ?`,
        [student_id, year, monthName, newStatus, newStatus]
    );
}

export async function toggleMonthPayment(student_id: number, year: string, month: string, newStatus: string) {
    const db = await getDb();
    try {
        await db.run(
            `INSERT INTO monthly_status (student_id, year, month, status) 
             VALUES (?, ?, ?, ?)
             ON CONFLICT(student_id, year, month) DO UPDATE SET status = ?`,
            [student_id, year, month, newStatus, newStatus]
        );
        revalidatePath('/alumnos');
        return { success: true };
    } catch (error: any) {
        console.error('Error toggling month:', error);
        return { success: false, error: error.message };
    }
}

export async function addStudent(formData: {
  name: string;
  category: string;
  group_name?: string;
  gender?: string;
  team?: string;
  notes?: string;
  monthly_quota?: number;
  phone?: string;
  enrollment_date?: string; // YYYY-MM-DD
  status?: string;
}) {
  const db = await getDb();
  const { name, category, group_name, gender, team, notes, monthly_quota, phone, enrollment_date, status } = formData;

  const finalStatus = status || 'ACTIVE';
  const finalEnrollment = enrollment_date || new Date().toISOString().split('T')[0];

  try {
    const result = await db.run(
      `INSERT INTO students (name, category, group_name, gender, team, status, notes, monthly_quota, phone, enrollment_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
          name.toUpperCase(), category, group_name || '', gender || null, 
          team || null, finalStatus, notes || '', monthly_quota || 0, phone || '', finalEnrollment
      ]
    );

    const studentId = result.lastID;

    // Initialize monthly status for the year from enrollment month to current month
    const enrollDate = new Date(finalEnrollment);
    const enrollMonthIdx = enrollDate.getMonth();
    const enrollYear = enrollDate.getFullYear().toString();
    const currentMonthIdx = new Date().getMonth();
    
    // Only add months if they are in the same year, and start from enrollment month
    if (new Date().getFullYear() === enrollDate.getFullYear()) {
        for (let i = enrollMonthIdx; i <= currentMonthIdx; i++) {
            await db.run(
                `INSERT INTO monthly_status (student_id, year, month, status) VALUES (?, ?, ?, ?)`,
                [studentId, enrollYear, MONTHS[i], finalStatus === 'SUSPENDIDO' ? 'SUSPENDIDO' : 'UNPAID']
            );
        }
    }

    revalidatePath('/alumnos');
    return { success: true, id: studentId };
  } catch (error: any) {
    console.error('Error adding student:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Registers a new payment and updates relevant student statuses.
 */
export async function addPayment(paymentData: {
  student_id: number;
  payment_date: string;
  month_covered: string; // YYYY-MM-DD
  amount_paid: number;
  month_value: number;
  rubro: string;
  method: string;
  receipt?: string;
  status: string; // e.g., 'ABONADA', 'PARCIAL'
  info?: string;
}) {
  const db = await getDb();
  const { 
    student_id, payment_date, month_covered, amount_paid, 
    month_value, rubro, method, receipt, status, info 
  } = paymentData;

  try {
    const parts = month_covered.split('-');
    const due_date_str = `${parts[0]}-${parts[1]}-10`;
    
    const pDate = new Date(payment_date);
    const dueDate = new Date(due_date_str);
    const delayDays = Math.floor((pDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const balance = month_value - amount_paid;

    await db.run(
      `INSERT INTO payments (
        student_id, payment_date, month_covered, amount_paid, month_value,
        estado, rubro, method, receipt, due_date, balance, delay_days, info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id, payment_date, month_covered, amount_paid, month_value,
        status, rubro, method, receipt || '', due_date_str, balance, delayDays, info || ''
      ]
    );

    await syncMonthlyStatus(student_id, month_covered);

    revalidatePath('/alumnos');
    revalidatePath('/cobros');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error adding payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Updates an existing payment.
 */
export async function updatePayment(id: number, paymentData: any) {
    const db = await getDb();
    try {
        const oldPayment = await db.get(`SELECT student_id, month_covered FROM payments WHERE id = ?`, [id]);
        
        const { 
            payment_date, month_covered, amount_paid, 
            month_value, rubro, method, receipt, status, info 
        } = paymentData;

        const parts = month_covered.split('-');
        const due_date_str = `${parts[0]}-${parts[1]}-10`;
        const pDate = new Date(payment_date);
        const dueDate = new Date(due_date_str);
        const delayDays = Math.floor((pDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const balance = month_value - amount_paid;

        await db.run(
            `UPDATE payments SET 
                payment_date = ?, month_covered = ?, amount_paid = ?, month_value = ?,
                estado = ?, rubro = ?, method = ?, receipt = ?, due_date = ?, 
                balance = ?, delay_days = ?, info = ?
             WHERE id = ?`,
            [
                payment_date, month_covered, amount_paid, month_value,
                status, rubro, method, receipt || '', due_date_str, 
                balance, delayDays, info || '', id
            ]
        );

        // Sync both old month (if changed) and new month
        await syncMonthlyStatus(oldPayment.student_id, oldPayment.month_covered);
        if (oldPayment.month_covered !== month_covered) {
            await syncMonthlyStatus(oldPayment.student_id, month_covered);
        }

        revalidatePath('/alumnos');
        revalidatePath('/cobros');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating payment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a payment.
 */
export async function deletePayment(id: number) {
    const db = await getDb();
    try {
        const payment = await db.get(`SELECT student_id, month_covered FROM payments WHERE id = ?`, [id]);
        if (!payment) return { success: false, error: 'Payment not found' };

        await db.run(`DELETE FROM payments WHERE id = ?`, [id]);

        await syncMonthlyStatus(payment.student_id, payment.month_covered);

        revalidatePath('/alumnos');
        revalidatePath('/cobros');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting payment:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates a student's basic info or notes.
 */
export async function updateStudent(id: number, data: any) {
    const db = await getDb();
    try {
        const fields = Object.keys(data).map((k: string) => `${k} = ?`).join(', ');
        const values = [...Object.values(data), id];
        await db.run(`UPDATE students SET ${fields} WHERE id = ?`, values);
        revalidatePath('/alumnos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Deletes a student and all their related records (payments, status).
 */
export async function deleteStudent(id: number) {
    const db = await getDb();
    try {
        await db.run('BEGIN TRANSACTION');
        await db.run(`DELETE FROM monthly_status WHERE student_id = ?`, [id]);
        await db.run(`DELETE FROM payments WHERE student_id = ?`, [id]);
        await db.run(`DELETE FROM students WHERE id = ?`, [id]);
        await db.run('COMMIT');

        revalidatePath('/alumnos');
        revalidatePath('/cobros');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        await db.run('ROLLBACK');
        console.error('Error deleting student:', error);
        return { success: false, error: error.message };
    }
}
