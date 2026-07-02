import { getDb } from '../lib/db';

async function main() {
    const db = await getDb();
    console.log("Starting reconciliation of extra charges...");
    
    const charges = await db.all("SELECT * FROM student_extra_charges WHERE status = 'PAID'");
    console.log(`Found ${charges.length} PAID extra charges to verify.`);
    
    let createdCount = 0;
    
    for (const ec of charges) {
        // Check if payment already exists
        const payment = await db.get(
            "SELECT id FROM payments WHERE receipt = ? AND student_id = ?", 
            [`CE-${ec.id}`, ec.student_id]
        );
        
        if (!payment) {
            const paymentDate = ec.due_date || new Date().toISOString().split('T')[0];
            const parts = paymentDate.split('-');
            const monthCovered = `${parts[0] || new Date().getFullYear()}-${parts[1] || '01'}-01`;
            const info = `Pago de cargo especial: ${ec.item_name} ${ec.notes ? `(${ec.notes})` : ''}`.trim();
            
            // Determine payment method from notes
            let method = 'TRANSFERENCIA';
            const notesUpper = (ec.notes || '').toUpperCase();
            if (notesUpper.includes('$$$') || notesUpper.includes('EFECTIVO') || notesUpper.includes('EFE')) {
                method = 'EFECTIVO';
            } else if (notesUpper.includes('MP') || notesUpper.includes('MERCADO') || notesUpper.length > 8) {
                method = 'MP';
            }
            
            const pDate = new Date(paymentDate);
            const dueDate = new Date(ec.due_date || paymentDate);
            const delayDays = Math.floor((pDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            
            await db.run(
              `INSERT INTO payments (
                student_id, payment_date, month_covered, amount_paid, month_value,
                estado, rubro, method, receipt, due_date, balance, delay_days, info
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                ec.student_id, paymentDate, monthCovered, ec.amount, ec.amount,
                'ABONADA', ec.rubro, method, `CE-${ec.id}`, ec.due_date || paymentDate, 0, delayDays, info
              ]
            );
            createdCount++;
        }
    }
    
    console.log(`Reconciliation finished. Created ${createdCount} missing payments.`);
}

main().catch(console.error);
