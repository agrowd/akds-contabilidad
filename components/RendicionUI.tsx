'use client';

import React, { useState, useMemo } from 'react';
import { exportToExcel, exportToPDF } from '@/lib/export';

interface Reconciliation {
  id: number;
  date: string;
  payment_count: number;
  rubro: string;
  cash_total: number;
  transfer_total: number;
  grand_total: number;
  cobrado: number;
}

interface StaffPayment {
  id: number;
  date: string;
  recipient: string;
  amount: number;
  academy: string;
}

interface RendicionUIProps {
  reconciliations: Reconciliation[];
  stats: {
    total_records: number;
    total_rendido: number;
    total_cash: number;
    total_transfer: number;
  };
  staffPayments: StaffPayment[];
  staffStats: {
    total_payments: number;
    total_amount: number;
  };
}

export default function RendicionUI({ reconciliations, stats, staffPayments, staffStats }: RendicionUIProps) {
  const [rubroFilter, setRubroFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');

  const rubros = [...new Set(reconciliations.map(r => r.rubro))];

  const months = [...new Set(reconciliations.map(r => r.date ? r.date.substring(0, 7) : ''))].filter(Boolean).sort().reverse();

  const filtered = useMemo(() => {
    let res = reconciliations;
    if (rubroFilter !== 'ALL') res = res.filter(r => r.rubro === rubroFilter);
    if (monthFilter !== 'ALL') res = res.filter(r => r.date && r.date.startsWith(monthFilter));
    return res;
  }, [reconciliations, rubroFilter, monthFilter]);

  const handleExportExcel = () => {
    const data = filtered.map(r => ({
      ID: r.id,
      Fecha: r.date,
      Rubro: r.rubro,
      Pagos: r.payment_count,
      RendidoBanco: r.grand_total,
      CobroReal: r.cobrado,
      Diferencia: r.cobrado - r.grand_total
    }));
    exportToExcel(data, `Rendiciones_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Fecha', dataKey: 'date' },
      { header: 'Rubro', dataKey: 'rubro' },
      { header: 'Pagos', dataKey: 'payment_count' },
      { header: 'Rendido Bank', dataKey: 'grand_total' },
      { header: 'Cobro Real', dataKey: 'cobrado' },
    ];
    exportToPDF(filtered, `Rendiciones_${new Date().toISOString().split('T')[0]}`, 'Reporte de Rendición', columns);
  };

  const filteredTotal = filtered.reduce((sum, r) => sum + r.grand_total, 0);
  const totalCobrado = filtered.reduce((sum, r) => sum + r.cobrado, 0);

  // Percentage calculations
  const cashPercent = stats.total_rendido > 0 ? ((stats.total_cash / stats.total_rendido) * 100).toFixed(1) : '0';
  const transferPercent = stats.total_rendido > 0 ? ((stats.total_transfer / stats.total_rendido) * 100).toFixed(1) : '0';

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1 className="page-title title-gradient">Rendición</h1>
        <p className="page-subtitle">Cierre de caja diario y pagos a staff</p>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card glass glass-hover animate-in">
          <p className="stat-label">Total Rendido</p>
          <p className="stat-value">${stats.total_rendido.toLocaleString()}</p>
          <p className="stat-label">{stats.total_records} cierres</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-1">
          <p className="stat-label">Efectivo</p>
          <p className="stat-value">${stats.total_cash.toLocaleString()}</p>
          <p className="stat-label">{cashPercent}% del total</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-2">
          <p className="stat-label">Transferencias</p>
          <p className="stat-value">${stats.total_transfer.toLocaleString()}</p>
          <p className="stat-label">{transferPercent}% del total</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-3">
          <p className="stat-label">Pagos a Staff</p>
          <p className="stat-value">${staffStats.total_amount.toLocaleString()}</p>
          <p className="stat-label">{staffStats.total_payments} pagos</p>
        </div>
      </div>

      {/* CASH vs TRANSFER VISUAL BAR */}
      <div className="section">
        <div className="glass" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: '0.8rem' }}>💳 Efectivo vs Transferencias</h3>
          <div style={{ display: 'flex', height: '32px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            <div style={{
              width: `${cashPercent}%`,
              background: 'linear-gradient(90deg, rgba(0, 255, 136, 0.3), rgba(0, 255, 136, 0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)',
              transition: 'width 0.5s ease'
            }}>
              {Number(cashPercent) > 10 && `Efectivo ${cashPercent}%`}
            </div>
            <div style={{
              width: `${transferPercent}%`,
              background: 'linear-gradient(90deg, rgba(0, 210, 255, 0.15), rgba(0, 210, 255, 0.3))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary)',
              transition: 'width 0.5s ease'
            }}>
              {Number(transferPercent) > 10 && `Transferencia ${transferPercent}%`}
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS & AUDIT SUMMARY */}
      <div className="filters-bar">
        <select className="filter-select" value={rubroFilter} onChange={e => setRubroFilter(e.target.value)}>
          <option value="ALL">Todos los rubros</option>
          {rubros.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="filter-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="ALL">Todos los meses</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <button onClick={handleExportExcel} className="btn" style={{ background: '#217346', color: 'white', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            📊 Excel
          </button>
          <button onClick={handleExportPDF} className="btn" style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            📄 PDF
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '1rem' }}>
          <span className="filter-count">
            {filtered.length} cierres · Rendido: <strong>${filteredTotal.toLocaleString()}</strong>
          </span>
          <span className={`badge ${totalCobrado === filteredTotal ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
            Integridad: {totalCobrado === filteredTotal ? '✓ 100%' : `⚠️ Diferencia: $${(totalCobrado - filteredTotal).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* RECONCILIATION TABLE (ENTRECRUZAMIENTO) */}
      <div className="section">
        <div className="glass table-wrapper">
          <div className="table-header">
            <h3 className="table-title">🔍 Tabla de Entrecruzamiento (WhatsApp Audit)</h3>
            <p className="text-dim" style={{ fontSize: '0.75rem', margin: 0 }}>Compara el cierre manual de caja vs. la suma de pagos individuales registrados.</p>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Rubro</th>
                  <th className="text-center">Pagos</th>
                  <th className="text-right">Rendido (Bank)</th>
                  <th className="text-right">Cobro Real</th>
                  <th className="text-right">Diferencia</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const diff = r.cobrado - r.grand_total;
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                      <td><span className="category-badge">{r.rubro}</span></td>
                      <td className="text-center">{r.payment_count}</td>
                      <td className="text-right" style={{ fontWeight: 600 }}>${r.grand_total.toLocaleString()}</td>
                      <td className="text-right" style={{ fontWeight: 600, color: 'var(--secondary)' }}>${r.cobrado.toLocaleString()}</td>
                      <td className="text-right" style={{
                        fontWeight: 700,
                        color: diff === 0 ? 'var(--success)' : Math.abs(diff) < 100 ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {diff === 0 ? '-' : diff > 0 ? `+$${diff.toLocaleString()}` : `-$${Math.abs(diff).toLocaleString()}`}
                      </td>
                      <td className="text-center">
                        {diff === 0 
                          ? <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>CONSISTENTE</span>
                          : <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>DISCREPANCIA</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* STAFF PAYMENTS */}
      {staffPayments.length > 0 && (
        <div className="section">
          <div className="glass table-wrapper">
            <div className="table-header">
              <h3 className="table-title">👤 Pagos a Staff</h3>
              <span className="badge badge-secondary">${staffStats.total_amount.toLocaleString()}</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Quien Recibe</th>
                  <th>Academia</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {staffPayments.map(sp => (
                  <tr key={sp.id}>
                    <td>{sp.date}</td>
                    <td style={{ fontWeight: 600 }}>{sp.recipient}</td>
                    <td><span className="category-badge">{sp.academy}</span></td>
                    <td className="text-right" style={{ fontWeight: 700 }}>${sp.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
