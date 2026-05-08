'use client';

import React, { useState } from 'react';
import { addStudent } from '@/lib/actions';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
}

export default function AddStudentModal({ isOpen, onClose, categories }: AddStudentModalProps) {
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
    enrollment_date: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Default category if not selected
    const data = { 
      ...formData, 
      category: formData.category || 'Infantil',
      monthly_quota: formData.monthly_quota ? parseFloat(formData.monthly_quota) : 0
    };
    
    const result = await addStudent(data);
    
    setIsSubmitting(false);
    if (result.success) {
      onClose();
      // Reset form
      setFormData({ name: '', category: '', group_name: '', gender: '', team: '', notes: '', monthly_quota: '', phone: '', enrollment_date: '' });
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
          <h3 className="modal-title title-gradient">Nuevo Alumno</h3>
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
                  <option value="">Seleccionar...</option>
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
                <label className="form-label">Mes de Inicio (Inscripción)</label>
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

            <div style={{ 
              background: 'rgba(239, 68, 68, 0.05)', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              fontSize: '0.75rem',
              color: 'var(--danger-soft)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              <span>⚠️</span>
              <span style={{ color: 'var(--text-dim)' }}>
                El estado de los meses previos a la <strong>Fecha de Inscripción</strong> no generará deuda.
              </span>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Alumno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
