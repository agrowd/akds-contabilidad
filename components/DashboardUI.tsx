'use client';

import React, { useState, useMemo } from 'react';

interface Student {
  id: number;
  name: string;
  category: string;
  group_name: string;
}

interface Debtor {
  id: number;
  name: string;
  category: string;
  unpaid_months: number;
  paid_months: number;
}

interface Reconciliation {
  date: string;
  rendido: number;
  cobrado: number;
  rubro: string;
}

interface RevenueItem {
  method?: string;
  rubro?: string;
  count: number;
  total: number;
}

interface DashboardUIProps {
  stats: {
    total_students: number;
    total_revenue: number;
    total_txs: number;
    total_reconciled: number;
  };
  categories: { category: string; count: number }[];
  students: Student[];
  statusMap: Record<number, Record<string, string>>;
  reconciliations: Reconciliation[];
  debtors: Debtor[];
  revenueByMethod: RevenueItem[];
  revenueByRubro: RevenueItem[];
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export default function DashboardUI({
  stats, categories, students, statusMap,
  reconciliations, debtors, revenueByMethod, revenueByRubro
}: DashboardUIProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toUpperCase();
    return students.filter(s => s.name.toUpperCase().includes(term));
  }, [students, searchTerm]);

  const diffTotal = (stats.total_revenue || 0) - (stats.total_reconciled || 0);

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1 className="page-title title-gradient">Overview</h1>
        <p className="page-subtitle">Resumen general del estado financiero y de alumnos</p>
      </div>

      {/* STATS CARDS */}
      <div className="stats-grid">
        <div className="stat-card glass glass-hover animate-in">
          <p className="stat-label">Revenue Total</p>
          <p className="stat-value">${(stats.total_revenue || 0).toLocaleString()}</p>
          <p className="stat-label">{stats.total_txs} pagos registrados</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-1">
          <p className="stat-label">Total Rendido</p>
          <p className="stat-value">${(stats.total_reconciled || 0).toLocaleString()}</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-2">
          <p className="stat-label">Diferencia</p>
          <p className={`stat-value ${Math.abs(diffTotal) > 0 ? 'text-warning' : 'text-success'}`}>
            ${(diffTotal || 0).toLocaleString()}
          </p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-3">
          <p className="stat-label">Total Alumnos</p>
          <p className="stat-value">{stats.total_students}</p>
        </div>
      </div>

      {/* CATEGORIES + REVENUE BREAKDOWN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        {/* Categories */}
        <div className="glass" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 className="section-title">👥 Alumnos por Categoría</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map(cat => (
              <div key={cat.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{cat.category}</span>
                <span className="badge badge-secondary">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Rubro */}
        <div className="glass" style={{ padding: '1.25rem 1.5rem' }}>
          <h3 className="section-title">💰 Revenue por Rubro</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {revenueByRubro.map(item => (
              <div key={item.rubro} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--card-border)' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.rubro}</span>
                  <span className="text-dim" style={{ fontSize: '0.72rem', marginLeft: '0.5rem' }}>{item.count} pagos</span>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>${(item.total || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP DEBTORS */}
      {debtors.length > 0 && (
        <div className="section">
          <div className="glass table-wrapper">
            <div className="table-header">
              <h3 className="table-title">🚨 Top Morosos</h3>
              <span className="badge badge-danger">{debtors.length} alumnos</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Categoría</th>
                  <th className="text-center">Meses Impagos</th>
                  <th className="text-center">Meses Pagos</th>
                  <th className="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td><span className="category-badge">{d.category}</span></td>
                    <td className="text-center text-danger" style={{ fontWeight: 700 }}>{d.unpaid_months}</td>
                    <td className="text-center text-success">{d.paid_months}</td>
                    <td className="text-center">
                      {d.unpaid_months >= 3
                        ? <span className="badge badge-danger">Crítico</span>
                        : d.unpaid_months >= 2
                          ? <span className="badge badge-warning">Riesgo</span>
                          : <span className="badge badge-primary">Pendiente</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENT MATRIX */}
      <div className="section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}>
            📅 Matriz de Pagos ({filteredStudents.length}/{students.length})
          </h3>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: '240px' }}
          />
        </div>

        <div className="glass matrix-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="sticky-col">Alumno</th>
                <th>Cat.</th>
                {MONTHS.map(m => <th key={m}>{m.substring(0, 3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s.id}>
                  <td className="sticky-col">{s.name}</td>
                  <td><span className="category-badge">{s.category.split(' ')[0]}</span></td>
                  {MONTHS.map(m => {
                    const st = statusMap[s.id]?.[m] || 'UNPAID';
                    const cls = st === 'PAID' ? 'status-paid' : st === 'PARTIAL' ? 'status-partial' : 'status-unpaid';
                    return (
                      <td key={m}>
                        <div className={`matrix-cell ${cls}`}>
                          {st === 'PAID' ? '✓' : st === 'PARTIAL' ? '~' : '✗'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECONCILIATION TABLE */}
      <div className="section">
        <div className="glass table-wrapper">
          <div className="table-header">
            <h3 className="table-title">📋 Rendición vs Cobros</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Rubro</th>
                <th className="text-right">Rendido</th>
                <th className="text-right">Cobrado</th>
                <th className="text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((d, i) => {
                const diff = (d.cobrado || 0) - (d.rendido || 0);
                return (
                  <tr key={i}>
                    <td>{d.date}</td>
                    <td><span className="category-badge">{d.rubro}</span></td>
                    <td className="text-right">${(d.rendido || 0).toLocaleString()}</td>
                    <td className="text-right">${(d.cobrado || 0).toLocaleString()}</td>
                    <td className="text-right" style={{ color: diff !== 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>
                      ${(diff || 0).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT METHODS */}
      {revenueByMethod.length > 0 && (
        <div className="section">
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {revenueByMethod.map(item => (
              <div key={item.method} className="stat-card glass glass-hover">
                <p className="stat-label">{item.method}</p>
                <p className="stat-value">${(item.total || 0).toLocaleString()}</p>
                <p className="stat-label">{item.count} operaciones</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
