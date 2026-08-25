'use client';

import React, { useState, useMemo } from 'react';
import EditPaymentModal from './EditPaymentModal';
import { deletePayment, togglePaymentRendido } from '@/lib/actions';
import { exportToExcel, exportToPDF } from '@/lib/export';

interface Payment {
  id: number;
  student_id: number | null;
  student_name?: string;
  category?: string;
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
  rendido?: number;
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
    total_efectivo: number;
    total_digital: number;
    total_pendiente: number;
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
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [rendidoFilter, setRendidoFilter] = useState('ALL');
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Group all payments by concept / monthly quota to identify companion payments
  const { paymentGroups, paymentGroupKeyMap } = useMemo(() => {
    const groups: Record<string, Payment[]> = {};
    const keyMap: Record<number, string> = {};

    payments.forEach(p => {
      let key = `single_${p.id}`;
      if (p.student_id) {
        if (p.receipt && p.receipt.startsWith('CE-')) {
          key = `ce_${p.student_id}_${p.receipt}`;
        } else if (p.month_covered) {
          const ym = p.month_covered.substring(0, 7);
          const rub = (p.rubro || 'CUOTA').toUpperCase().trim();
          key = `month_${p.student_id}_${ym}_${rub}`;
        }
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
      keyMap[p.id] = key;
    });

    // Sort each group chronologically
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => {
        const dateA = a.payment_date || '';
        const dateB = b.payment_date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.id - b.id;
      });
    });

    return { paymentGroups: groups, paymentGroupKeyMap: keyMap };
  }, [payments]);

  const filtered = useMemo(() => {
    let result = payments;
    if (search) {
      const term = search.toUpperCase();
      result = result.filter(p => 
        (p.student_name || 'ADMINISTRACIÓN').toUpperCase().includes(term) || 
        (p.info || '').toUpperCase().includes(term) ||
        (p.rubro || '').toUpperCase().includes(term) ||
        (p.receipt || '').toUpperCase().includes(term)
      );
    }
    if (rubroFilter !== 'ALL') result = result.filter(p => p.rubro === rubroFilter);
    if (methodFilter !== 'ALL') result = result.filter(p => p.method === methodFilter);
    if (estadoFilter !== 'ALL') result = result.filter(p => p.estado === estadoFilter);
    if (monthFilter !== 'ALL') result = result.filter(p => p.month_covered === monthFilter);
    if (rendidoFilter !== 'ALL') {
      if (rendidoFilter === 'PENDIENTE') {
        result = result.filter(p => p.method === 'EFECTIVO' && !p.rendido);
      } else if (rendidoFilter === 'RENDIDO') {
        result = result.filter(p => p.method === 'EFECTIVO' && p.rendido === 1);
      }
    }
    return result;
  }, [payments, search, rubroFilter, methodFilter, estadoFilter, monthFilter, rendidoFilter]);

  const filteredTotal = filtered.reduce((sum, p) => sum + p.amount_paid, 0);

  const faltaRendir = useMemo(() => {
    return payments
      .filter(p => p.method === 'EFECTIVO' && !p.rendido)
      .reduce((sum, p) => sum + p.amount_paid, 0);
  }, [payments]);

  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleDelete = async (id: number) => {
      if (!confirm('¿Estás seguro de que deseas eliminar este pago?')) return;
      const result = await deletePayment(id);
      if (!result.success) alert('Error: ' + result.error);
  };

  const handleEdit = (payment: Payment) => {
      setEditingPayment(payment);
      setIsEditModalOpen(true);
  };

  const handleToggleRendido = async (id: number, currentRendido: number) => {
      const result = await togglePaymentRendido(id, currentRendido);
      if (!result.success) {
          alert('Error: ' + result.error);
      } else {
          window.location.reload();
      }
  };

  const handleExportExcel = () => {
    const data = filtered.map(p => ({
      ID: p.id,
      Alumno: p.student_name,
      Categoría: p.category,
      Fecha: p.payment_date,
      Mes: p.month_covered,
      Monto: p.amount_paid,
      ValorCuota: p.month_value,
      Estado: p.estado,
      Rubro: p.rubro,
      Método: p.method,
      Recibo: p.receipt,
      Saldo: p.balance,
      Demora: p.delay_days,
      Info: p.info
    }));
    exportToExcel(data, `Cobros_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'Fecha', dataKey: 'payment_date' },
      { header: 'Alumno', dataKey: 'student_name' },
      { header: 'Rubro', dataKey: 'rubro' },
      { header: 'Mes', dataKey: 'month_covered' },
      { header: 'Monto', dataKey: 'amount_paid' },
      { header: 'Método', dataKey: 'method' },
      { header: 'Estado', dataKey: 'estado' },
      { header: 'Saldo', dataKey: 'balance' }
    ];
    exportToPDF(filtered, `Cobros_${new Date().toISOString().split('T')[0]}`, 'Reporte de Cobros', columns);
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
        <p className="page-subtitle">Registro financiero detallado, trazabilidad de pagos parciales y movimientos cruzados</p>
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
          <p className="stat-label">Recaudado Efectivo</p>
          <p className="stat-value text-success">${(stats.total_efectivo || 0).toLocaleString()}</p>
          <p className="stat-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '0.25rem' }}>
            <span>Cobros en efectivo</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>Falta rendir: ${faltaRendir.toLocaleString()}</span>
          </p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-2">
          <p className="stat-label">Recaudado MP / Transf.</p>
          <p className="stat-value" style={{ color: '#60a5fa' }}>${(stats.total_digital || 0).toLocaleString()}</p>
          <p className="stat-label">Cobros digitales</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-3">
          <p className="stat-label">Monto Pendiente</p>
          <p className="stat-value text-warning">${(stats.total_pendiente || 0).toLocaleString()}</p>
          <p className="stat-label">Saldo pendiente de cobro</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="🔍 Buscar por alumno, concepto, rubro, recibo..."
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
        <select className="filter-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="ALL">Todos los meses</option>
          {MONTHS_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="filter-select" value={rendidoFilter} onChange={e => setRendidoFilter(e.target.value)}>
          <option value="ALL">Rendición: Todas</option>
          <option value="PENDIENTE">Pendientes de Rendir</option>
          <option value="RENDIDO">Rendidos</option>
        </select>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <button onClick={handleExportExcel} className="btn" style={{ background: '#217346', color: 'white', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            📊 Excel
          </button>
          <button onClick={handleExportPDF} className="btn" style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            📄 PDF
          </button>
        </div>
        <span className="filter-count">
          {filtered.length} cobros · Subtotal: ${(filteredTotal || 0).toLocaleString()}
        </span>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="section">
        <div className="glass table-wrapper">
          <div className="table-header">
            <h3 className="table-title">Registro de Cobros y Movimientos</h3>
          </div>
          <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alumno / Concepto</th>
                  <th>Fecha Pago</th>
                  <th>Cuota / Mes</th>
                  <th className="text-right">Monto Pagado</th>
                  <th className="text-right">Valor Total</th>
                  <th className="text-center">Demora</th>
                  <th>Método</th>
                  <th className="text-center">Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const delayCls = p.delay_days > 0 ? 'text-warning' : p.delay_days < 0 ? 'text-success' : 'text-dim';
                  const groupKey = paymentGroupKeyMap[p.id] || `single_${p.id}`;
                  const companions = paymentGroups[groupKey] || [p];
                  const hasCompanions = companions.length > 1;
                  const groupTotalPaid = companions.reduce((sum, item) => sum + item.amount_paid, 0);
                  const groupTargetValue = p.month_value > 0 ? p.month_value : groupTotalPaid;
                  const groupRemaining = Math.max(0, groupTargetValue - groupTotalPaid);
                  const isExpanded = !!expandedGroups[groupKey];
                  const paymentIndexInGroup = companions.findIndex(item => item.id === p.id) + 1;
                  const isPartial = groupRemaining > 0 || p.amount_paid < groupTargetValue;

                  return (
                    <React.Fragment key={p.id}>
                      <tr 
                        style={{ 
                          background: p.rendido === 1 ? 'rgba(16, 185, 129, 0.02)' : isExpanded ? 'rgba(0, 255, 136, 0.03)' : 'transparent',
                          opacity: p.rendido === 1 ? 0.75 : 1,
                          borderBottom: hasCompanions && isExpanded ? 'none' : undefined
                        }}
                      >
                        <td style={{ fontWeight: 600, textDecoration: p.rendido === 1 ? 'line-through' : 'none' }}>
                          <div>
                            {p.student_name || <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>⚙️ Guido (Admin)</span>}
                          </div>
                          
                          {/* SIBLING PAYMENTS / MULTI-PAYMENT BADGE */}
                          {hasCompanions ? (
                            <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ 
                                fontSize: '0.65rem', 
                                padding: '0.1rem 0.35rem', 
                                borderRadius: '4px', 
                                background: 'rgba(245, 158, 11, 0.15)', 
                                color: '#f59e0b', 
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontWeight: 600 
                              }}>
                                📋 Pago {paymentIndexInGroup} de {companions.length}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleGroupExpand(groupKey)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  padding: 0
                                }}
                              >
                                {isExpanded ? '▲ Ocultar otros pagos' : `▼ Ver historial (${companions.length} pagos)`}
                              </button>
                            </div>
                          ) : isPartial && p.student_id ? (
                            <div style={{ marginTop: '0.2rem' }}>
                              <span style={{ fontSize: '0.65rem', color: '#f59e0b' }}>
                                ⏳ Pago parcial (Resta: ${(p.month_value - p.amount_paid).toLocaleString()})
                              </span>
                            </div>
                          ) : null}
                        </td>

                        <td className="text-dim" style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{p.payment_date || '-'}</td>
                        
                        <td style={{ fontSize: '0.78rem' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem', marginRight: '0.3rem' }}>{p.rubro}</span>
                          <span>{p.month_covered ? p.month_covered.substring(0, 7) : '-'}</span>
                          {p.info && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{p.info}</div>}
                        </td>

                        <td className="text-right" style={{ fontWeight: 700, textDecoration: p.rendido === 1 ? 'line-through' : 'none' }}>
                          <span style={{ color: 'var(--success)' }}>${(p.amount_paid || 0).toLocaleString()}</span>
                        </td>

                        <td className="text-right text-dim" style={{ fontSize: '0.75rem' }}>
                          ${(groupTargetValue || 0).toLocaleString()}
                        </td>

                        <td className={`text-center ${delayCls}`} style={{ fontSize: '0.72rem', fontWeight: p.delay_days !== 0 ? 600 : 400 }}>
                          {p.delay_days > 0 ? `+${p.delay_days}d` : p.delay_days < 0 ? `${p.delay_days}d` : '-'}
                        </td>

                        <td style={{ fontSize: '0.78rem' }}>
                          {p.method === 'EFECTIVO' ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <input 
                                type="checkbox" 
                                checked={p.rendido === 1}
                                onChange={() => handleToggleRendido(p.id, p.rendido || 0)}
                                style={{ 
                                  cursor: 'pointer',
                                  width: '14px',
                                  height: '14px',
                                  accentColor: '#10b981'
                                }}
                                title={p.rendido === 1 ? "Marcar como pendiente de rendir" : "Marcar como rendido"}
                              />
                              <span>💵 {p.method}</span>
                            </div>
                          ) : (
                            <span>💳 {p.method || '-'}</span>
                          )}
                        </td>

                        <td className="text-center">
                          <span className={`badge ${p.estado === 'ABONADA' ? 'badge-success' : 'badge-warning'}`}>
                            {p.estado}
                          </span>
                        </td>

                        <td className="text-center">
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                {p.student_id ? (
                                    <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7 }} title="Editar">✏️</button>
                                ) : (
                                    <span style={{ fontSize: '0.9rem', opacity: 0.25, cursor: 'not-allowed', userSelect: 'none' }} title="Editar en la sección de Administración">✏️</span>
                                )}
                                <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.7 }} title="Eliminar">🗑️</button>
                            </div>
                        </td>
                      </tr>

                      {/* EXPANDED SIBLING PAYMENTS HISTORY ACCORDION */}
                      {hasCompanions && isExpanded && (
                        <tr style={{ background: 'rgba(0, 0, 0, 0.35)' }}>
                          <td colSpan={9} style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--card-border)' }}>
                            <div style={{ 
                              padding: '0.75rem', 
                              background: 'rgba(255, 255, 255, 0.03)', 
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  📋 Historial Completo de esta Cuota / Concepto ({companions.length} movimientos)
                                </span>
                                <div style={{ fontSize: '0.75rem', display: 'flex', gap: '1rem' }}>
                                  <span>Total Abonado: <strong style={{ color: 'var(--success)' }}>${groupTotalPaid.toLocaleString()}</strong> de ${groupTargetValue.toLocaleString()}</span>
                                  {groupRemaining > 0 ? (
                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>Resta: ${groupRemaining.toLocaleString()}</span>
                                  ) : (
                                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ Cuota Totalmente Abonada</span>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {companions.map((comp, cIdx) => (
                                  <div 
                                    key={comp.id} 
                                    style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center', 
                                      fontSize: '0.75rem', 
                                      padding: '0.3rem 0.5rem', 
                                      borderRadius: '4px',
                                      background: comp.id === p.id ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                      border: comp.id === p.id ? '1px solid rgba(0, 255, 136, 0.25)' : '1px solid transparent'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-dim)', minWidth: '55px' }}>Pago #{cIdx + 1}</span>
                                      <span>📅 {comp.payment_date || '-'}</span>
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        padding: '0.05rem 0.3rem', 
                                        borderRadius: '3px',
                                        background: comp.method === 'EFECTIVO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                                        color: comp.method === 'EFECTIVO' ? 'var(--success)' : '#60a5fa'
                                      }}>
                                        {comp.method === 'EFECTIVO' ? '💵 EFECTIVO' : '💳 ' + comp.method}
                                      </span>
                                      {comp.receipt && <code style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Recibo: {comp.receipt}</code>}
                                      {comp.info && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>· {comp.info}</span>}
                                      {comp.id === p.id && (
                                        <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem' }}>
                                          Fila Actual
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <strong style={{ color: 'var(--success)', fontSize: '0.8rem' }}>+${comp.amount_paid.toLocaleString()}</strong>
                                      <button onClick={() => handleEdit(comp)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }} title="Editar este pago">✏️</button>
                                      <button onClick={() => handleDelete(comp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }} title="Eliminar este pago">🗑️</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
