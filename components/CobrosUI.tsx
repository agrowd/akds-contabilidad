'use client';

import React, { useState, useMemo } from 'react';
import EditPaymentModal from './EditPaymentModal';
import { deletePayment } from '@/lib/actions';

interface Payment {
  id: number;
  student_id: number;
  student_name: string;
  category: string;
  payment_date: string;
  month_covered: string;
  amount_paid: number;
  month_value: number;
  estado: string;
  rubro: string;
  method: string;
  receipt: string;
  due_date: string;
  balance: number;
  delay_days: number;
  info: string;
}

interface MonthlySummary {
  rubro: string;
  month: string;
  total: number;
}

interface CobrosUIProps {
  payments: Payment[];
  stats: {
    total_payments: number;
    total_amount: number;
    total_abonada: number;
    total_pendiente: number;
    total_balance: number;
  };
  monthlySummary: MonthlySummary[];
  rubros: string[];
  methods: string[];
}

const MONTHS_ORDER = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export default function CobrosUI({ payments, stats, monthlySummary, rubros, methods }: CobrosUIProps) {
  const [search, setSearch] = useState('');
  const [rubroFilter, setRubroFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [estadoFilter, setEstadoFilter] = useState('ALL');
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = payments;
    if (search) {
      const term = search.toUpperCase();
      result = result.filter(p => p.student_name.toUpperCase().includes(term));
    }
    if (rubroFilter !== 'ALL') result = result.filter(p => p.rubro === rubroFilter);
    if (methodFilter !== 'ALL') result = result.filter(p => p.method === methodFilter);
    if (estadoFilter !== 'ALL') result = result.filter(p => p.estado === estadoFilter);
    return result;
  }, [payments, search, rubroFilter, methodFilter, estadoFilter]);

  const filteredTotal = filtered.reduce((sum, p) => sum + p.amount_paid, 0);

  const handleDelete = async (id: number) => {
      if (!confirm('¿Estás seguro de que deseas eliminar este pago?')) return;
      const result = await deletePayment(id);
      if (!result.success) alert('Error: ' + result.error);
  };

  const handleEdit = (payment: Payment) => {
      setEditingPayment(payment);
      setIsEditModalOpen(true);
  };

  // Build monthly summary matrix
  const summaryRubros = [...new Set(monthlySummary.map(s => s.rubro))];
  const summaryByRubroMonth: Record<string, Record<string, number>> = {};
  monthlySummary.forEach(s => {
    if (!summaryByRubroMonth[s.rubro]) summaryByRubroMonth[s.rubro] = {};
    summaryByRubroMonth[s.rubro][s.month] = s.total;
  });

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1 className="page-title title-gradient">Cobros</h1>
        <p className="page-subtitle">Registro financiero detallado y cruzado</p>
      </div>

      <EditPaymentModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        payment={editingPayment}
        studentName={editingPayment?.student_name}
      />

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card glass glass-hover animate-in">
          <p className="stat-label">Total Cobrado</p>
          <p className="stat-value">${(stats.total_amount || 0).toLocaleString()}</p>
          <p className="stat-label">{stats.total_payments} pagos registrados</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-1">
          <p className="stat-label">Abonadas (✓)</p>
          <p className="stat-value text-success">${(stats.total_abonada || 0).toLocaleString()}</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-2">
          <p className="stat-label">Pendientes (⚠️)</p>
          <p className="stat-value text-warning">${(stats.total_pendiente || 0).toLocaleString()}</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-3">
          <p className="stat-label">Saldo Final</p>
          <p className={`stat-value ${(stats.total_balance || 0) < 0 ? 'text-danger' : 'text-success'}`}>
            ${(stats.total_balance || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="🔍 Buscar por alumno..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={rubroFilter} onChange={e => setRubroFilter(e.target.value)}>
          <option value="ALL">Todos los rubros</option>
          {rubros.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="filter-select" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
          <option value="ALL">Todos los métodos</option>
          {methods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="filter-select" value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
          <option value="ALL">Todos los estados</option>
          <option value="ABONADA">Abonada</option>
          <option value="PENDIENTE">Pendiente</option>
        </select>
        <span className="filter-count">
          {filtered.length} cobros · Subtotal: ${filteredTotal.toLocaleString()}
        </span>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="section">
        <div className="glass table-wrapper">
          <div className="table-header">
            <h3 className="table-title">Registro de Cobros (WhatsApp Audit Ready)</h3>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Fecha Pago</th>
                  <th>Cuota Mes</th>
                  <th className="text-right">Pagado</th>
                  <th className="text-right">Valor Cuota</th>
                  <th className="text-center">Demora</th>
                  <th>Método</th>
                  <th className="text-center">Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const delayCls = p.delay_days > 0 ? 'text-warning' : p.delay_days < 0 ? 'text-success' : 'text-dim';
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{p.student_name}</td>
                      <td className="text-dim" style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{p.payment_date || '-'}</td>
                      <td style={{ fontSize: '0.78rem' }}>{p.month_covered ? p.month_covered.substring(0, 7) : '-'}</td>
                      <td className="text-right" style={{ fontWeight: 700 }}>${(p.amount_paid || 0).toLocaleString()}</td>
                      <td className="text-right text-dim" style={{ fontSize: '0.72rem' }}>${(p.month_value || 0).toLocaleString()}</td>
                      <td className={`text-center ${delayCls}`} style={{ fontSize: '0.72rem', fontWeight: p.delay_days !== 0 ? 600 : 400 }}>
                        {p.delay_days > 0 ? `+${p.delay_days}d` : p.delay_days < 0 ? `${p.delay_days}d` : '-'}
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{p.method || '-'}</td>
                      <td className="text-center">
                        <span className={`badge ${p.estado === 'ABONADA' ? 'badge-success' : 'badge-warning'}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="text-center">
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7 }} title="Editar">✏️</button>
                              <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7 }} title="Eliminar">🗑️</button>
                          </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MONTHLY SUMMARY */}
      {summaryRubros.length > 0 && (
        <div className="section">
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 className="section-title" style={{ marginBottom: '1rem' }}>📊 Resumen Mensual por Rubro (Cálculo Automático)</h3>
            <div className="matrix-wrapper">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th className="sticky-col" style={{ minWidth: '160px' }}>Rubro</th>
                    {MONTHS_ORDER.map(m => <th key={m}>{m.substring(0, 3)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {summaryRubros.map(rubro => (
                    <tr key={rubro}>
                      <td className="sticky-col" style={{ fontSize: '0.78rem', fontWeight: 600 }}>{rubro}</td>
                      {MONTHS_ORDER.map(m => {
                        const val = summaryByRubroMonth[rubro]?.[m] || 0;
                        return (
                          <td key={m} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: val > 0 ? 600 : 400, color: val > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {val > 0 ? `$${(val / 1000).toFixed(0)}k` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
