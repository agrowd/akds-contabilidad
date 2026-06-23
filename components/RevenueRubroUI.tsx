'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Payment {
  id: number;
  student_id: number | null;
  student_name: string | null;
  category: string | null;
  payment_date: string;
  month_covered: string | null;
  amount_paid: number;
  month_value: number;
  estado: string;
  rubro: string;
  method: string;
  receipt?: string;
  balance: number;
  delay_days: number;
  info: string;
}

interface RevenueRubroUIProps {
  selectedRubro: string;
  rubros: string[];
  payments: Payment[];
  stats: {
    count: number;
    total: number;
    total_efectivo: number;
    total_digital: number;
  };
}

export default function RevenueRubroUI({ selectedRubro, rubros, payments, stats }: RevenueRubroUIProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Extract student categories present in these payments
  const studentCategories = useMemo(() => {
    const cats = payments
      .map(p => p.category || 'ADMINISTRACIÓN')
      .filter(Boolean);
    return [...new Set(cats)].sort();
  }, [payments]);

  // Handle rubro dropdown change
  const handleRubroChange = (rubro: string) => {
    if (rubro === 'ALL') {
      router.push('/revenue-rubro');
    } else {
      router.push(`/revenue-rubro?rubro=${encodeURIComponent(rubro)}`);
    }
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    let result = payments;

    if (search) {
      const term = search.toUpperCase();
      result = result.filter(p => 
        (p.student_name || 'ADMINISTRACIÓN').toUpperCase().includes(term) ||
        (p.info || '').toUpperCase().includes(term) ||
        (p.receipt || '').toUpperCase().includes(term)
      );
    }

    if (methodFilter !== 'ALL') {
      if (methodFilter === 'EFECTIVO') {
        result = result.filter(p => (p.method || '').toUpperCase() === 'EFECTIVO');
      } else if (methodFilter === 'DIGITAL') {
        result = result.filter(p => ['MP - TRANSFERENCIA', 'TRANSFERENCIA', 'MP'].includes((p.method || '').toUpperCase()));
      }
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(p => (p.category || 'ADMINISTRACIÓN') === categoryFilter);
    }

    return result;
  }, [payments, search, methodFilter, categoryFilter]);

  // Recalculate stats for the filtered set
  const filteredStats = useMemo(() => {
    const total = filteredPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const count = filteredPayments.length;
    const cash = filteredPayments
      .filter(p => (p.method || '').toUpperCase() === 'EFECTIVO')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const digital = filteredPayments
      .filter(p => ['MP - TRANSFERENCIA', 'TRANSFERENCIA', 'MP'].includes((p.method || '').toUpperCase()))
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    return {
      total,
      count,
      cash,
      digital
    };
  }, [filteredPayments]);

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title title-gradient">Revenue por Rubro</h1>
          <p className="page-subtitle">Desglose y listado de transacciones por categoría de cobro</p>
        </div>
        <Link href="/" className="btn btn-secondary glass-hover" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          ← Volver al Overview
        </Link>
      </div>

      {/* RUBRO SELECTOR & STATS SUMMARY */}
      <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Seleccionar Rubro:</label>
          <select 
            className="filter-select"
            value={selectedRubro}
            onChange={e => handleRubroChange(e.target.value)}
            style={{ minWidth: '240px', margin: 0 }}
          >
            <option value="ALL">[ TODOS LOS RUBROS ]</option>
            {rubros.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', margin: 0, padding: 0 }}>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">Total Recaudado</p>
            <p className="stat-value" style={{ color: 'var(--primary)' }}>
              ${filteredStats.total.toLocaleString()}
            </p>
            <p className="stat-label">De un total de {stats.total.toLocaleString()} original</p>
          </div>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">Recaudado en Efectivo</p>
            <p className="stat-value" style={{ color: 'var(--success)' }}>
              ${filteredStats.cash.toLocaleString()}
            </p>
            <p className="stat-label">En billetes físicos</p>
          </div>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">MercadoPago / Transf.</p>
            <p className="stat-value" style={{ color: 'var(--secondary)' }}>
              ${filteredStats.digital.toLocaleString()}
            </p>
            <p className="stat-label">Medios electrónicos</p>
          </div>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">Cant. Transacciones</p>
            <p className="stat-value">
              {filteredStats.count}
            </p>
            <p className="stat-label">Operaciones filtradas</p>
          </div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por alumno, recibo o detalle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">Todas las Academias</option>
          {studentCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select 
          className="filter-select"
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
        >
          <option value="ALL">Todos los Métodos</option>
          <option value="EFECTIVO">Efectivo ($$$)</option>
          <option value="DIGITAL">MP / Transferencia</option>
        </select>

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Mostrando {filteredPayments.length} pagos
        </div>
      </div>

      {/* TABLE LIST */}
      <div className="section">
        {filteredPayments.length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>💸</span>
            <h3>No se encontraron registros de cobros</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Pruebe cambiando los filtros o el rubro seleccionado.</p>
          </div>
        ) : (
          <div className="glass table-wrapper">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Alumno</th>
                    <th>Academia / Cat.</th>
                    <th>Concepto / Mes</th>
                    <th>Rubro</th>
                    <th>Método</th>
                    <th>Comprobante</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="payment-row-hover">
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{p.payment_date}</td>
                      <td style={{ fontWeight: 600 }}>
                        {p.student_id ? (
                          <Link href={`/alumnos?id=${p.student_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }} className="hover-underline">
                            {p.student_name}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            ⚙️ Guido (Admin)
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="category-badge">
                          {p.category || 'ADMINISTRACIÓN'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {p.month_covered ? p.month_covered.substring(0, 7) : p.info || '-'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{p.rubro}</td>
                      <td style={{ fontSize: '0.85rem' }}>{p.method}</td>
                      <td style={{ fontSize: '0.85rem' }}><code>{p.receipt || '-'}</code></td>
                      <td className="text-right" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>
                        ${p.amount_paid.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
