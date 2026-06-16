'use client';

import React, { useState, useMemo } from 'react';
import { addAdminPayment, updateAdminPayment, deleteAdminPayment } from '@/lib/actions';

interface Payment {
  id: number;
  payment_date: string;
  amount_paid: number;
  rubro: string;
  method: string;
  receipt?: string;
  info: string;
}

interface PagosAdministracionUIProps {
  payments: Payment[];
  rubros: string[];
  methods: string[];
}

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'MP', 'OTRO'];
const RUBROS_DEFAULT = ['ADMINISTRACION', 'GENERAL', 'DONACIÓN', 'SPONSORSHIP', 'OTROS'];

export default function PagosAdministracionUI({ payments, rubros, methods }: PagosAdministracionUIProps) {
  const [search, setSearch] = useState('');
  const [rubroFilter, setRubroFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: '',
    rubro: 'ADMINISTRACION',
    custom_rubro: '',
    method: 'TRANSFERENCIA',
    receipt: '',
    info: ''
  });

  const [showCustomRubro, setShowCustomRubro] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    return {
      total,
      count: payments.length
    };
  }, [payments]);

  // Filtered payments
  const filtered = useMemo(() => {
    let result = payments;

    if (search) {
      const term = search.toUpperCase();
      result = result.filter(p => 
        (p.info || '').toUpperCase().includes(term) || 
        (p.receipt || '').toUpperCase().includes(term) ||
        (p.rubro || '').toUpperCase().includes(term)
      );
    }

    if (rubroFilter !== 'ALL') {
      result = result.filter(p => p.rubro === rubroFilter);
    }

    if (methodFilter !== 'ALL') {
      result = result.filter(p => p.method === methodFilter);
    }

    return result;
  }, [payments, search, rubroFilter, methodFilter]);

  const handleOpenAdd = () => {
    setEditingPayment(null);
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      amount_paid: '',
      rubro: 'ADMINISTRACION',
      custom_rubro: '',
      method: 'TRANSFERENCIA',
      receipt: '',
      info: ''
    });
    setShowCustomRubro(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Payment) => {
    setEditingPayment(p);
    const isCustom = !RUBROS_DEFAULT.includes(p.rubro);
    setFormData({
      payment_date: p.payment_date || '',
      amount_paid: (p.amount_paid || 0).toString(),
      rubro: isCustom ? 'OTRO' : p.rubro,
      custom_rubro: isCustom ? p.rubro : '',
      method: p.method || 'TRANSFERENCIA',
      receipt: p.receipt || '',
      info: p.info || ''
    });
    setShowCustomRubro(isCustom);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este pago administrativo? Se restará del total general.')) return;
    const result = await deleteAdminPayment(id);
    if (!result.success) {
      alert('Error al eliminar: ' + result.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const finalRubro = (formData.rubro === 'OTRO' ? formData.custom_rubro : formData.rubro).toUpperCase().trim();
    if (!finalRubro) {
      alert('Por favor especifica el rubro.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      payment_date: formData.payment_date,
      amount_paid: parseFloat(formData.amount_paid),
      rubro: finalRubro,
      method: formData.method,
      receipt: formData.receipt,
      info: formData.info
    };

    let result;
    if (editingPayment) {
      result = await updateAdminPayment(editingPayment.id, payload);
    } else {
      result = await addAdminPayment(payload);
    }

    setIsSubmitting(false);
    if (result.success) {
      setIsModalOpen(false);
    } else {
      alert('Error al guardar: ' + result.error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'rubro') {
        setShowCustomRubro(value === 'OTRO');
      }
      return updated;
    });
  };

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1 className="page-title title-gradient">Pagos de Administración</h1>
        <p className="page-subtitle">Ingresos generales y cobros administrativos realizados a Guido (sin alumno asociado)</p>
      </div>

      {/* STATS PANEL */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card glass glass-hover animate-in">
          <p className="stat-label">Total Ingresos Admin</p>
          <p className="stat-value" style={{ color: 'var(--warning)' }}>${stats.total.toLocaleString()}</p>
          <p className="stat-label">Reflejados en el Total General</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-1">
          <p className="stat-label">Cantidad de Transacciones</p>
          <p className="stat-value">{stats.count}</p>
          <p className="stat-label">Registros administrativos en caja</p>
        </div>
      </div>

      {/* FILTER & ACTION BAR */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por detalle, recibo o rubro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="filter-select" 
          value={rubroFilter} 
          onChange={e => setRubroFilter(e.target.value)}
        >
          <option value="ALL">Todos los rubros</option>
          {rubros.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select 
          className="filter-select" 
          value={methodFilter} 
          onChange={e => setMethodFilter(e.target.value)}
        >
          <option value="ALL">Todos los métodos</option>
          {methods.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <button 
          className="btn btn-primary glass-hover" 
          style={{ marginLeft: 'auto', boxShadow: '0 0 20px var(--primary-glow)' }}
          onClick={handleOpenAdd}
        >
          ✨ Registrar Pago Admin
        </button>
      </div>

      {/* PAYMENTS LIST */}
      <div className="section">
        {filtered.length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>💸</span>
            <h3>No se encontraron pagos de administración</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Utiliza el botón superior para registrar un nuevo cobro general.</p>
          </div>
        ) : (
          <div className="glass table-wrapper">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto / Detalle</th>
                    <th>Rubro</th>
                    <th>Método</th>
                    <th>Recibo</th>
                    <th className="text-right">Monto</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="payment-row-hover">
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{p.payment_date}</td>
                      <td style={{ fontWeight: 500, fontSize: '0.88rem' }}>{p.info || '-'}</td>
                      <td>
                        <span className="category-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                          {p.rubro}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{p.method}</td>
                      <td style={{ fontSize: '0.85rem' }}><code>{p.receipt || '-'}</code></td>
                      <td className="text-right" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>
                        ${p.amount_paid.toLocaleString()}
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            onClick={() => handleOpenEdit(p)} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7 }} 
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7 }} 
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass animate-in" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title title-gradient">
                {editingPayment ? 'Editar Pago de Administración' : 'Registrar Pago de Administración'}
              </h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                <div style={{
                  background: 'rgba(0, 210, 255, 0.05)',
                  border: '1px solid rgba(0, 210, 255, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.8rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                  color: 'var(--secondary)',
                  lineHeight: '1.4'
                }}>
                  ℹ️ Este cobro ingresará bajo la cuenta general de Guido y se verá reflejado en la portada.
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Fecha de Cobro</label>
                    <input
                      type="date"
                      name="payment_date"
                      className="form-input"
                      value={formData.payment_date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto ($)</label>
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
                </div>

                <div className="grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Rubro / Categoría</label>
                    <select
                      name="rubro"
                      className="form-select"
                      value={formData.rubro}
                      onChange={handleChange}
                      required
                    >
                      {RUBROS_DEFAULT.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="OTRO">Otro (especificar...)</option>
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

                {showCustomRubro && (
                  <div className="form-group animate-in">
                    <label className="form-label">Nombre del nuevo Rubro</label>
                    <input
                      type="text"
                      name="custom_rubro"
                      className="form-input"
                      placeholder="Ej: ALQUILER BUFFET"
                      value={formData.custom_rubro}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Comprobante / Recibo #</label>
                  <input
                    type="text"
                    name="receipt"
                    className="form-input"
                    placeholder="Ej: MP-98124"
                    value={formData.receipt}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Detalles / ¿Qué se cobró? (Requerido)</label>
                  <textarea
                    name="info"
                    className="form-textarea"
                    style={{ minHeight: '80px' }}
                    placeholder="Ej: Aporte mensual de Sponsor Pepsi / Cobro alquiler Buffet mes de Junio..."
                    value={formData.info}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
