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

interface PendingExtraCharge {
  id: number;
  student_id: number;
  rubro: string;
  item_name: string;
  amount: number;
  due_date: string;
  status: string;
  notes: string;
  student_name: string | null;
  category: string | null;
}

interface UnifiedItem {
  id: string;
  type: 'PAYMENT' | 'PENDING_CHARGE';
  student_id: number | null;
  student_name: string;
  category: string;
  date: string;
  concept: string;
  rubro: string;
  method: string;
  receipt: string;
  amount: number;
  status: 'COBRADO' | 'PENDIENTE';
}

interface RevenueRubroUIProps {
  selectedRubro: string;
  rubros: string[];
  payments: Payment[];
  pendingExtraCharges?: PendingExtraCharge[];
  stats: {
    total_paid: number;
    count_paid: number;
    total_pending: number;
    count_pending: number;
  };
}

export default function RevenueRubroUI({
  selectedRubro,
  rubros,
  payments,
  pendingExtraCharges = [],
  stats
}: RevenueRubroUIProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Combine payments and pending extra charges into a unified list
  const unifiedItems = useMemo(() => {
    const list: UnifiedItem[] = [];

    payments.forEach(p => {
      list.push({
        id: `P-${p.id}`,
        type: 'PAYMENT',
        student_id: p.student_id,
        student_name: p.student_name || 'ADMINISTRACIÓN',
        category: p.category || 'ADMINISTRACIÓN',
        date: p.payment_date,
        concept: p.month_covered ? p.month_covered.substring(0, 7) : p.info || p.rubro,
        rubro: p.rubro,
        method: p.method || 'TRANSFERENCIA',
        receipt: p.receipt || '-',
        amount: p.amount_paid,
        status: 'COBRADO'
      });
    });

    pendingExtraCharges.forEach(ec => {
      list.push({
        id: `EC-${ec.id}`,
        type: 'PENDING_CHARGE',
        student_id: ec.student_id,
        student_name: ec.student_name || 'ALUMNO',
        category: ec.category || 'SIN CATEGORÍA',
        date: ec.due_date || '-',
        concept: ec.item_name || ec.rubro,
        rubro: ec.rubro,
        method: 'PENDIENTE',
        receipt: `CE-${ec.id}`,
        amount: ec.amount,
        status: 'PENDIENTE'
      });
    });

    // Sort by date DESC
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, pendingExtraCharges]);

  // Extract student categories present in these items
  const studentCategories = useMemo(() => {
    const cats = unifiedItems.map(item => item.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [unifiedItems]);

  // Handle rubro dropdown change
  const handleRubroChange = (rubro: string) => {
    if (rubro === 'ALL') {
      router.push('/revenue-rubro');
    } else {
      router.push(`/revenue-rubro?rubro=${encodeURIComponent(rubro)}`);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    let result = unifiedItems;

    if (search) {
      const term = search.toUpperCase();
      result = result.filter(item => 
        item.student_name.toUpperCase().includes(term) ||
        item.concept.toUpperCase().includes(term) ||
        item.receipt.toUpperCase().includes(term) ||
        item.rubro.toUpperCase().includes(term)
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(item => item.status === statusFilter);
    }

    if (methodFilter !== 'ALL') {
      if (methodFilter === 'EFECTIVO') {
        result = result.filter(item => item.method.toUpperCase() === 'EFECTIVO');
      } else if (methodFilter === 'DIGITAL') {
        result = result.filter(item => ['MP - TRANSFERENCIA', 'TRANSFERENCIA', 'MP'].includes(item.method.toUpperCase()));
      }
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(item => item.category === categoryFilter);
    }

    return result;
  }, [unifiedItems, search, statusFilter, methodFilter, categoryFilter]);

  // Recalculate stats for the filtered set
  const filteredStats = useMemo(() => {
    const totalPaid = filteredItems.filter(i => i.status === 'COBRADO').reduce((sum, i) => sum + i.amount, 0);
    const countPaid = filteredItems.filter(i => i.status === 'COBRADO').length;
    
    const totalPending = filteredItems.filter(i => i.status === 'PENDIENTE').reduce((sum, i) => sum + i.amount, 0);
    const countPending = filteredItems.filter(i => i.status === 'PENDIENTE').length;

    const cash = filteredItems
      .filter(i => i.status === 'COBRADO' && i.method.toUpperCase() === 'EFECTIVO')
      .reduce((sum, i) => sum + i.amount, 0);
      
    const digital = filteredItems
      .filter(i => i.status === 'COBRADO' && ['MP - TRANSFERENCIA', 'TRANSFERENCIA', 'MP'].includes(i.method.toUpperCase()))
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      totalPaid,
      countPaid,
      totalPending,
      countPending,
      totalProjected: totalPaid + totalPending,
      cash,
      digital
    };
  }, [filteredItems]);

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title title-gradient">Revenue por Rubro</h1>
          <p className="page-subtitle">Desglose y listado completo de transacciones y cargos pendientes por rubro</p>
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
            style={{ minWidth: '260px', margin: 0 }}
          >
            <option value="ALL">[ TODOS LOS RUBROS ]</option>
            {rubros.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', margin: 0, padding: 0 }}>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">Total Recaudado (Cobrado)</p>
            <p className="stat-value" style={{ color: 'var(--success)' }}>
              ${filteredStats.totalPaid.toLocaleString()}
            </p>
            <p className="stat-label">{filteredStats.countPaid} pagos cobrados</p>
          </div>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">Total Pendiente (Por Cobrar)</p>
            <p className="stat-value" style={{ color: '#f59e0b' }}>
              ${filteredStats.totalPending.toLocaleString()}
            </p>
            <p className="stat-label">{filteredStats.countPending} cargos pendientes</p>
          </div>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">Total Proyectado del Rubro</p>
            <p className="stat-value" style={{ color: 'var(--primary)' }}>
              ${filteredStats.totalProjected.toLocaleString()}
            </p>
            <p className="stat-label">Cobrado + Deuda activa</p>
          </div>
          <div className="stat-card glass" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="stat-label">Efectivo vs Digital (Cobrados)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>💵 ${filteredStats.cash.toLocaleString()} (Efe)</span>
              <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 600 }}>💳 ${filteredStats.digital.toLocaleString()} (Dig)</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="filters-bar">
        <div className="search-box" style={{ flex: 1, minWidth: '220px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por alumno, concepto, recibo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Todos los Estados</option>
          <option value="COBRADO">Solo Cobrados</option>
          <option value="PENDIENTE">Solo Pendientes / Impagos</option>
        </select>

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
          Mostrando {filteredItems.length} registros
        </div>
      </div>

      {/* TABLE LIST */}
      <div className="section">
        {filteredItems.length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>💸</span>
            <h3>No se encontraron registros de cobros o cargos</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Pruebe cambiando los filtros o el rubro seleccionado.</p>
          </div>
        ) : (
          <div className="glass table-wrapper">
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha / Venc.</th>
                    <th>Alumno</th>
                    <th>Academia / Cat.</th>
                    <th>Concepto / Ítem</th>
                    <th>Rubro</th>
                    <th>Método</th>
                    <th>Comprobante</th>
                    <th className="text-center">Estado</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} className="payment-row-hover">
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{item.date}</td>
                      <td style={{ fontWeight: 600 }}>
                        {item.student_id ? (
                          <Link href={`/alumnos?id=${item.student_id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }} className="hover-underline">
                            {item.student_name}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            ⚙️ {item.student_name}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="category-badge">
                          {item.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{item.concept}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{item.rubro}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {item.status === 'COBRADO' ? (
                          item.method.toUpperCase() === 'EFECTIVO' ? '💵 EFECTIVO' : '💳 ' + item.method
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}><code>{item.receipt}</code></td>
                      <td className="text-center">
                        {item.status === 'COBRADO' ? (
                          <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>✅ COBRADO</span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>⏳ PENDIENTE</span>
                        )}
                      </td>
                      <td className="text-right" style={{ 
                        fontWeight: 700, 
                        fontSize: '0.95rem', 
                        color: item.status === 'COBRADO' ? 'var(--success)' : '#f59e0b' 
                      }}>
                        ${item.amount.toLocaleString()}
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
