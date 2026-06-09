'use client';

import React, { useState, useEffect } from 'react';
import { updateStudent } from '@/lib/actions';

interface StudentData {
  id: number;
  name: string;
  category: string;
  group_name: string;
  gender: string | null;
  team: string | null;
  status: string;
  notes: string;
  monthly_quota: number;
  phone: string;
  enrollment_date: string;
  period_end_date?: string;
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentData | null;
}

export default function EditStudentModal({ isOpen, onClose, student }: EditStudentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    group_name: '',
    gender: '',
    team: '',
    notes: '',
    monthly_quota: '',
    phone: '',
    enrollment_date: '',
    period_end_date: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        category: student.category || 'Infantil',
        group_name: student.group_name || '',
        gender: student.gender || '',
        team: student.team || '',
        notes: student.notes || '',
        monthly_quota: student.monthly_quota ? student.monthly_quota.toString() : '0',
        phone: student.phone || '',
        enrollment_date: student.enrollment_date ? student.enrollment_date.substring(0, 10) : '',
        period_end_date: student.period_end_date ? student.period_end_date.substring(0, 10) : '2026-12-31'
      });
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const data = { 
      name: formData.name.toUpperCase(),
      category: formData.category,
      group_name: formData.group_name,
      gender: formData.gender || null,
      team: formData.team || null,
      notes: formData.notes,
      monthly_quota: formData.monthly_quota ? parseFloat(formData.monthly_quota) : 0,
      phone: formData.phone,
      enrollment_date: formData.enrollment_date,
      period_end_date: formData.period_end_date
    };
    
    const result = await updateStudent(student.id, data);
    
    setIsSubmitting(false);
    if (result.success) {
      onClose();
    } else {
      alert('Error al guardar: ' + result.error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass animate-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title title-gradient">Editar Datos de Alumno</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group animate-in animate-in-delay-1">
              <label className="form-label">Nombre Completo</label>
              <input 
                type="text" 
                name="name" 
                className="form-input" 
                placeholder="Ej: JUAN PEREZ" 
                value={formData.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="grid-cols-2">
              <div className="form-group animate-in animate-in-delay-2">
                <label className="form-label">Categoría</label>
                <select 
                  name="category" 
                  className="form-select" 
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  <option value="Infantil">Infantil</option>
                  <option value="Andar FC Adultos">Andar FC Adultos</option>
                  <option value="Sindrome de Down">Sindrome de Down</option>
                </select>
              </div>
              <div className="form-group animate-in animate-in-delay-2">
                <label className="form-label">Grupo</label>
                <input 
                  type="text" 
                  name="group_name" 
                  className="form-input" 
                  placeholder="Ej: INF-A" 
                  value={formData.group_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">Género</label>
                <select 
                  name="gender" 
                  className="form-select" 
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Opcional...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">WhatsApp (Sin +)</label>
                <input 
                  type="text" 
                  name="phone" 
                  className="form-input" 
                  placeholder="Ej: 5491112345678" 
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">Equipo</label>
                <input 
                  type="text" 
                  name="team" 
                  className="form-input" 
                  placeholder="Ej: Equipo I" 
                  value={formData.team}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">Cuota Sugerida ($)</label>
                <input 
                  type="number" 
                  name="monthly_quota" 
                  className="form-input" 
                  placeholder="5000" 
                  value={formData.monthly_quota}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid-cols-2">
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">Inicio Período (Alta)</label>
                <input 
                  type="date" 
                  name="enrollment_date" 
                  className="form-input" 
                  value={formData.enrollment_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group animate-in animate-in-delay-3">
                <label className="form-label">Fin Período (Último Mes)</label>
                <input 
                  type="date" 
                  name="period_end_date" 
                  className="form-input" 
                  value={formData.period_end_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group animate-in animate-in-delay-3">
              <label className="form-label">Notas / Observaciones</label>
              <textarea 
                name="notes" 
                className="form-textarea" 
                placeholder="Alguna aclaración importante..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
