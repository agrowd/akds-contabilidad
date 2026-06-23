'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface Student {
  id: number;
  name: string;
  category: string;
  group_name: string;
  status: string;
  enrollment_date: string;
  period_end_date?: string;
}

interface Debtor {
  id: number;
  name: string;
  category: string;
  unpaid_months: number;
  paid_months: number;
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
    total_payments: number;
    total_efectivo: number;
    total_digital: number;
  };
  categories: { category: string; count: number }[];
  students: Student[];
  statusMap: Record<number, Record<string, string>>;
  debtors: Debtor[];
  revenueByMethod: RevenueItem[];
  revenueByRubro: RevenueItem[];
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export default function DashboardUI({
  stats, categories, students, statusMap,
  debtors, revenueByMethod, revenueByRubro
}: DashboardUIProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState('ALL');

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toUpperCase();
    return students.filter(s => s.name.toUpperCase().includes(term));
  }, [students, searchTerm]);

  const matrixFilteredStudents = useMemo(() => {
    let result = filteredStudents;
    if (matrixCategoryFilter !== 'ALL') {
      result = result.filter(s => s.category === matrixCategoryFilter);
    }
    return result;
  }, [filteredStudents, matrixCategoryFilter]);

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
          <p className="stat-label">{stats.total_payments} pagos registrados</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-1">
          <p className="stat-label">Recaudado Efectivo ($$$)</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>${(stats.total_efectivo || 0).toLocaleString()}</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-2">
          <p className="stat-label">Recaudado MP / Transf.</p>
          <p className="stat-value" style={{ color: 'var(--primary)' }}>${(stats.total_digital || 0).toLocaleString()}</p>
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
          <h3 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💰 Revenue por Rubro</span>
            <Link href="/revenue-rubro" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }} className="hover-underline">
              Ver todos ↗
            </Link>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {revenueByRubro.map(item => (
              <Link 
                key={item.rubro} 
                href={`/revenue-rubro?rubro=${encodeURIComponent(item.rubro || '')}`}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.6rem 0.8rem', 
                  borderBottom: '1px solid var(--card-border)',
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: 'var(--radius-sm)'
                }}
                className="payment-row-hover"
              >
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{item.rubro}</span>
                  <span className="text-dim" style={{ fontSize: '0.72rem', marginLeft: '0.5rem' }}>{item.count} pagos</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>${(item.total || 0).toLocaleString()}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>→</span>
                </div>
              </Link>
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
                    <td style={{ fontWeight: 600 }}>
                      <Link href={`/alumnos?id=${d.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} className="hover-underline">
                        {d.name} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>↗</span>
                      </Link>
                    </td>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}>
            📅 Matriz de Pagos ({matrixFilteredStudents.length}/{students.length})
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              className="filter-select"
              value={matrixCategoryFilter}
              onChange={(e) => setMatrixCategoryFilter(e.target.value)}
              style={{ minWidth: '180px', margin: 0 }}
            >
              <option value="ALL">Todas las Academias</option>
              {categories.map(c => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: '240px', margin: 0 }}
            />
          </div>
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
              {matrixFilteredStudents.map(s => {
                const startYearMonth = s.enrollment_date ? s.enrollment_date.substring(0, 7) : '2026-02';
                const currentYearStr = new Date().getFullYear().toString();
                const endYearMonth = s.period_end_date ? s.period_end_date.substring(0, 7) : `${currentYearStr}-12`;

                return (
                  <tr key={s.id}>
                    <td className="sticky-col">{s.name}</td>
                    <td><span className="category-badge">{s.category.split(' ')[0]}</span></td>
                    {MONTHS.map((m, idx) => {
                      const targetYearMonth = `${currentYearStr}-${String(idx + 1).padStart(2, '0')}`;
                      const inRange = targetYearMonth >= startYearMonth && targetYearMonth <= endYearMonth;

                      const st = statusMap[s.id]?.[m] || 'UNPAID';
                      let displayStatus = st;

                      if (!inRange) {
                        displayStatus = 'EXEMPT';
                      } else if (displayStatus === 'UNPAID' && s.status !== 'SUSPENDIDO') {
                        const currentMonth = new Date().getMonth();
                        const currentDay = new Date().getDate();
                        if (currentMonth > idx || (currentMonth === idx && currentDay > 10)) {
                          displayStatus = 'MOROSO';
                        }
                      }

                      const cls = displayStatus === 'EXEMPT' ? 'status-exempt'
                                : displayStatus === 'PAID' ? 'status-paid' 
                                : displayStatus === 'PARTIAL' ? 'status-partial' 
                                : displayStatus === 'DESHABILITADO' ? 'status-disabled'
                                : displayStatus === 'SUSPENDIDO' ? 'status-suspended'
                                : displayStatus === 'MOROSO' ? 'status-danger'
                                : 'status-unpaid';

                      return (
                        <td key={m}>
                          <div className={`matrix-cell ${cls}`} title={!inRange ? 'Fuera de período' : `Estado: ${displayStatus}`}>
                            {displayStatus === 'PAID' ? '✓' 
                             : displayStatus === 'PARTIAL' ? '~' 
                             : displayStatus === 'EXEMPT' ? '-' 
                             : displayStatus === 'DESHABILITADO' ? '🚫'
                             : displayStatus === 'SUSPENDIDO' ? '⏸'
                             : '✗'}
                          </div>
                        </td>
                      );
                    })}
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
