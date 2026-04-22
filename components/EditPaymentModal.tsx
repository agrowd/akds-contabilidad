'use client';

import React, { useState, useEffect } from 'react';
import { updatePayment } from '@/lib/actions';

interface Payment {
    id: number;
    student_id: number;
    payment_date: string;
    month_covered: string;
    amount_paid: number;
    month_value: number;
    estado: string;
    rubro: string;
    method: string;
    receipt: string;
    info: string;
}

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  studentName?: string;
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const RUBROS = ['CUOTA INFANTIL', 'CUOTA ADULTOS', 'LIGA LFI', 'CUOTA SD', 'FICHAJE', 'CUOTA TALLER - CDD', 'OTROS'];
const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'MP', 'OTRO'];

export default function EditPaymentModal({ isOpen, onClose, payment, studentName }: EditPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: '',
    month_covered: '',
    amount_paid: '',
    month_value: '',
    rubro: '',
    method: '',
    receipt: '',
    info: ''
  });

  useEffect(() => {
    if (payment) {
        // month_covered is YYYY-MM-DD
        const monthParts = (payment.month_covered || '').split('-');
        const monthIdx = monthParts.length > 1 ? parseInt(monthParts[1]) - 1 : 0;
        
        setFormData({
            payment_date: payment.payment_date || '',
            month_covered: MONTHS[monthIdx] || MONTHS[0],
            amount_paid: (payment.amount_paid ?? 0).toString(),
            month_value: (payment.month_value ?? 0).toString(),
            rubro: payment.rubro || '',
            method: payment.method || '',
            receipt: payment.receipt || '',
            info: payment.info || ''
        });
    }
  }, [payment]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const currentYear = payment.month_covered.split('-')[0];
    const monthIdx = MONTHS.indexOf(formData.month_covered);
    const monthStr = (monthIdx + 1).toString().padStart(2, '0');
    const monthDayOne = `${currentYear}-${monthStr}-01`;

    const result = await updatePayment(payment.id, {
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
    } else {
      alert('Error al actualizar pago: ' + result.error);
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
          <h3 className="modal-title title-gradient">Editar Pago</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
          <span className="badge badge-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            👤 Alumno: <strong style={{ color: '#fff', marginLeft: '0.3rem' }}>{studentName || '...'}</strong>
          </span>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid-cols-2">
              <div className="form-group">
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
              <div className="form-group">
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
              <div className="form-group">
                <label className="form-label">Monto Pagado ($)</label>
                <input 
                  type="number" 
                  name="amount_paid" 
                  className="form-input" 
                  value={formData.amount_paid}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Cuota ($)</label>
                <input 
                  type="number" 
                  name="month_value" 
                  className="form-input" 
                  value={formData.month_value}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Rubro</label>
                <select 
                  name="rubro" 
                  className="form-select" 
                  value={formData.rubro}
                  onChange={handleChange}
                  required
                >
                  {RUBROS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
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

            <div className="form-group">
              <label className="form-label">Comprobante / Recibo #</label>
              <input 
                type="text" 
                name="receipt" 
                className="form-input" 
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
              {isSubmitting ? 'Actualizando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
