'use client';

import React, { useState, useEffect } from 'react';
import { addPayment } from '@/lib/actions';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: { id: number, name: string, category: string, monthly_quota?: number } | null;
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const RUBROS = ['CUOTA INFANTIL', 'CUOTA ADULTOS', 'LIGA LFI', 'CUOTA SD', 'FICHAJE', 'CUOTA TALLER - CDD', 'OTROS'];
const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'MP', 'OTRO'];

export default function AddPaymentModal({ isOpen, onClose, student }: AddPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    month_covered: '',
    amount_paid: '',
    month_value: '', 
    rubro: '',
    method: 'EFECTIVO',
    receipt: '',
    info: ''
  });

  useEffect(() => {
    if (student) {
        // Try to guess rubro from student category
        const guessedRubro = student.category === 'INFANTIL' ? 'CUOTA INFANTIL' : 'CUOTA SD';
        const quota = (student.monthly_quota !== undefined && student.monthly_quota !== null && student.monthly_quota > 0) 
            ? student.monthly_quota.toString() 
            : '5000';
            
        setFormData(prev => ({ 
            ...prev, 
            rubro: guessedRubro,
            month_value: quota
        }));
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Convert month name to YYYY-MM-DD (e.g. FEBRERO 2026 -> 2026-02-01)
    const currentYear = new Date().getFullYear();
    const monthIdx = MONTHS.indexOf(formData.month_covered);
    const monthStr = (monthIdx + 1).toString().padStart(2, '0');
    const monthDayOne = `${currentYear}-${monthStr}-01`;

    const result = await addPayment({
      student_id: student.id,
      payment_date: formData.payment_date,
      month_covered: monthDayOne,
      amount_paid: parseFloat(formData.amount_paid),
      month_value: parseFloat(formData.month_value),
      rubro: formData.rubro,
      method: formData.method,
      receipt: formData.receipt,
      status: parseFloat(formData.amount_paid) >= parseFloat(formData.month_value) ? 'ABONADA' : 'PARCIAL',
      info: formData.info
    });
    
    setIsSubmitting(false);
    if (result.success) {
      onClose();
      setFormData(prev => ({ ...prev, amount_paid: '', receipt: '', info: '' }));
    } else {
      alert('Error al guardar pago: ' + result.error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass animate-in" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title title-gradient">Registrar Pago</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
          <span className="badge badge-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            👤 Alumno: <strong style={{ color: '#fff', marginLeft: '0.3rem' }}>{student.name}</strong>
          </span>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-cols-2">
              <div className="form-group animate-in animate-in-delay-1">
                <label className="form-label">Mes que cubre</label>
                <select 
                  name="month_covered" 
                  className="form-select" 
                  value={formData.month_covered}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar mes...</option>
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group animate-in animate-in-delay-1">
                <label className="form-label">Fecha de Pago</label>
                <input 
                  type="date" 
                  name="payment_date" 
                  className="form-input" 
                  value={formData.payment_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group animate-in animate-in-delay-2">
                <label className="form-label">Monto Pagado ($)</label>
                <input 
                  type="number" 
                  name="amount_paid" 
                  className="form-input" 
                  placeholder="0.00" 
                  value={formData.amount_paid}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group animate-in animate-in-delay-2">
                <label className="form-label">Valor Cuota ($)</label>
                <input 
                  type="number" 
                  name="month_value" 
                  className="form-input" 
                  placeholder="5000.00" 
                  value={formData.month_value}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">Rubro</label>
                <select 
                  name="rubro" 
                  className="form-select" 
                  value={formData.rubro}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {RUBROS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">Método</label>
                <select 
                  name="method" 
                  className="form-select" 
                  value={formData.method}
                  onChange={handleChange}
                  required
                >
                  {METODOS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group animate-in animate-in-delay-3">
              <label className="form-label">Comprobante / Recibo #</label>
              <input 
                type="text" 
                name="receipt" 
                className="form-input" 
                placeholder="Ej: T-00123" 
                value={formData.receipt}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Detalles Adicionales</label>
              <textarea 
                name="info" 
                className="form-textarea" 
                style={{ minHeight: '60px' }}
                placeholder="..."
                value={formData.info}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
