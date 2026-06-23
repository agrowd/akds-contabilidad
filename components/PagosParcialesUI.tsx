'use client';

import React, { useState, useMemo } from 'react';
import AddPaymentModal from './AddPaymentModal';

interface Student {
  id: number;
  name: string;
  category: string;
  monthly_quota: number;
  status: string;
}

interface PartialStatus {
  student_id: number;
  month: string;
  year: string;
  status: string;
}

interface Payment {
  id: number;
  student_id: number;
  payment_date: string;
  month_covered: string;
  amount_paid: number;
  month_value: number;
  estado: string;
  rubro: string;
  method: string;
  receipt?: string;
  info?: string;
}

interface ExtraCharge {
  id: number;
  student_id: number;
  rubro: string;
  item_name: string;
  amount: number;
  due_date: string;
  status: string;
  notes: string;
  student_name: string;
  student_category: string;
  student_status: string;
}

interface PagosParcialesUIProps {
  students: Student[];
  partialStatuses: PartialStatus[];
  paymentsByStudent: Record<number, Payment[]>;
  extraCharges?: ExtraCharge[];
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export default function PagosParcialesUI({ students, partialStatuses, paymentsByStudent, extraCharges = [] }: PagosParcialesUIProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'CUOTAS' | 'ESPECIALES'>('CUOTAS');
  
  // Modal suggested pre-fills
  const [modalSuggestedRubro, setModalSuggestedRubro] = useState('');
  const [modalSuggestedAmount, setModalSuggestedAmount] = useState('');
  const [modalSuggestedReceipt, setModalSuggestedReceipt] = useState('');
  
  // State to manage expanding payment history for a specific row
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState<{ id: number, name: string, category: string, monthly_quota?: number } | null>(null);
  const [modalInitialMonth, setModalInitialMonth] = useState('');

  // Extract all available categories for filtering
  const categories = useMemo(() => {
    return [...new Set(students.map(s => s.category))].sort();
  }, [students]);

  // Process and compute partial payment data
  const partialPaymentsData = useMemo(() => {
    const data: {
      id: string; // unique key
      student_id: number;
      student_name: string;
      student_category: string;
      student_status: string;
      month: string;
      year: string;
      month_value: number;
      total_paid: number;
      remaining_balance: number;
      percent_paid: number;
      history: Payment[];
    }[] = [];

    partialStatuses.forEach(ps => {
      const student = students.find(s => s.id === ps.student_id);
      if (!student) return;

      const studentPayments = paymentsByStudent[ps.student_id] || [];
      const monthIdx = MONTHS.indexOf(ps.month);
      const monthStr = (monthIdx + 1).toString().padStart(2, '0');
      const prefix = `${ps.year}-${monthStr}`;

      // Get payments matching this month's covered date
      const monthPayments = studentPayments.filter(p => p.month_covered.startsWith(prefix));

      const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount_paid, 0);
      const quota = student.monthly_quota || 5000;
      const expectedValue = monthPayments.length > 0 ? monthPayments[0].month_value : quota;
      const remainingBalance = Math.max(0, expectedValue - totalPaid);
      const percentPaid = expectedValue > 0 ? Math.min(100, Math.round((totalPaid / expectedValue) * 100)) : 0;

      // Even if the DB says partial, only list if there is an actual remaining balance
      if (remainingBalance > 0) {
        data.push({
          id: `${ps.student_id}-${ps.month}`,
          student_id: ps.student_id,
          student_name: student.name,
          student_category: student.category,
          student_status: student.status,
          month: ps.month,
          year: ps.year,
          month_value: expectedValue,
          total_paid: totalPaid,
          remaining_balance: remainingBalance,
          percent_paid: percentPaid,
          history: monthPayments
        });
      }
    });

    return data;
  }, [students, partialStatuses, paymentsByStudent]);

  // Process and compute special charges data
  const specialPaymentsData = useMemo(() => {
    return extraCharges.map(ec => {
      const studentPayments = paymentsByStudent[ec.student_id] || [];
      // Filter payments of this student matching the rubro (CE-id or same rubro with no monthly prefix)
      const ecPayments = studentPayments.filter(p => 
        p.receipt === `CE-${ec.id}` || 
        (p.rubro === ec.rubro && (!p.receipt || p.receipt === '' || p.receipt === '-'))
      );

      const totalPaid = ecPayments.reduce((sum, p) => sum + p.amount_paid, 0);
      const remainingBalance = Math.max(0, ec.amount - totalPaid);
      const percentPaid = ec.amount > 0 ? Math.min(100, Math.round((totalPaid / ec.amount) * 100)) : 0;

      return {
        id: `EC-${ec.id}`,
        student_id: ec.student_id,
        student_name: ec.student_name,
        student_category: ec.student_category,
        student_status: ec.student_status,
        charge_id: ec.id,
        rubro: ec.rubro,
        item_name: ec.item_name,
        amount: ec.amount,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        percent_paid: percentPaid,
        due_date: ec.due_date,
        notes: ec.notes,
        history: ecPayments
      };
    }).filter(item => item.remaining_balance > 0);
  }, [extraCharges, paymentsByStudent]);

  // Filter the processed records
  const filtered = useMemo(() => {
    let result = partialPaymentsData;

    if (search) {
      const term = search.toUpperCase();
      result = result.filter(item => item.student_name.toUpperCase().includes(term));
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(item => item.student_category === categoryFilter);
    }

    return result;
  }, [partialPaymentsData, search, categoryFilter]);

  // Filtered special charges
  const filteredSpecials = useMemo(() => {
    let result = specialPaymentsData;

    if (search) {
      const term = search.toUpperCase();
      result = result.filter(item => item.student_name.toUpperCase().includes(term));
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(item => item.student_category === categoryFilter);
    }

    return result;
  }, [specialPaymentsData, search, categoryFilter]);

  // Compute stats based on the active tab
  const activeStats = useMemo(() => {
    const list = activeTab === 'CUOTAS' ? filtered : filteredSpecials;
    const totalPending = list.reduce((sum, item) => sum + item.remaining_balance, 0);
    const uniqueStudentsCount = new Set(list.map(item => item.student_id)).size;
    return {
      totalPending,
      uniqueStudentsCount,
      recordCount: list.length
    };
  }, [activeTab, filtered, filteredSpecials]);

  const handleOpenPaymentModal = (item: any, isSpecial: boolean = false) => {
    setModalStudent({
      id: item.student_id,
      name: item.student_name,
      category: item.student_category,
      monthly_quota: isSpecial ? item.amount : item.month_value
    });
    if (isSpecial) {
      setModalInitialMonth('');
      setModalSuggestedRubro(item.rubro);
      setModalSuggestedAmount(item.remaining_balance.toString());
      setModalSuggestedReceipt(`CE-${item.charge_id}`);
    } else {
      setModalInitialMonth(item.month);
      setModalSuggestedRubro('');
      setModalSuggestedAmount('');
      setModalSuggestedReceipt('');
    }
    setIsModalOpen(true);
  };

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1 className="page-title title-gradient">Pagos Parciales</h1>
        <p className="page-subtitle">Trazabilidad, control y completado de cuotas parciales</p>
      </div>

      {/* STATS PANEL */}
      <div className="stats-grid">
        <div className="stat-card glass glass-hover animate-in">
          <p className="stat-label">Saldo Pendiente Total</p>
          <p className="stat-value" style={{ color: '#f59e0b' }}>${activeStats.totalPending.toLocaleString()}</p>
          <p className="stat-label">{activeTab === 'CUOTAS' ? 'Deuda acumulada en cuotas parciales' : 'Deuda acumulada en cargos especiales'}</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-1">
          <p className="stat-label">Alumnos en Seguimiento</p>
          <p className="stat-value">{activeStats.uniqueStudentsCount}</p>
          <p className="stat-label">Alumnos con saldos pendientes</p>
        </div>
        <div className="stat-card glass glass-hover animate-in animate-in-delay-2">
          <p className="stat-label">{activeTab === 'CUOTAS' ? 'Cuotas Incompletas' : 'Cargos Pendientes'}</p>
          <p className="stat-value">{activeStats.recordCount}</p>
          <p className="stat-label">{activeTab === 'CUOTAS' ? 'Meses con pagos parciales activos' : 'Conceptos especiales pendientes de cobro'}</p>
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="ficha-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.25rem', gap: '1.5rem' }}>
        <button 
          type="button"
          onClick={() => setActiveTab('CUOTAS')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'CUOTAS' ? 'var(--primary)' : 'var(--text-dim)',
            fontWeight: 700,
            fontSize: '0.85rem',
            padding: '0.5rem 0',
            borderBottom: activeTab === 'CUOTAS' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          📅 Cuotas Mensuales ({filtered.length})
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('ESPECIALES')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'ESPECIALES' ? 'var(--primary)' : 'var(--text-dim)',
            fontWeight: 700,
            fontSize: '0.85rem',
            padding: '0.5rem 0',
            borderBottom: activeTab === 'ESPECIALES' ? '2px solid var(--primary)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          💎 Conceptos Especiales ({filteredSpecials.length})
        </button>
      </div>

      {/* FILTERS BAR */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre de alumno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="filter-select" 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Mostrando {activeTab === 'CUOTAS' ? filtered.length : filteredSpecials.length} registros
        </div>
      </div>

      {/* PARTIAL PAYMENTS LIST */}
      <div className="section">
        {(activeTab === 'CUOTAS' ? filtered : filteredSpecials).length === 0 ? (
          <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🎉</span>
            <h3>¡No hay pagos pendientes!</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Todos los alumnos tienen sus cuotas y cargos al día o deshabilitados.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {(activeTab === 'CUOTAS' ? filtered : filteredSpecials).map((item: any) => {
              const isExpanded = expandedRow === item.id;
              const expectedValue = activeTab === 'CUOTAS' ? item.month_value : item.amount;
              
              return (
                <div 
                  key={item.id} 
                  className="glass"
                  style={{ 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(20, 20, 25, 0.4)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Row Header/Main Info */}
                  <div 
                    style={{ 
                      padding: '1.25rem 1.5rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    {/* Alumno & Category */}
                    <div style={{ minWidth: '220px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.3rem' }}>
                        {item.student_name}
                      </h3>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span className="category-badge">{item.student_category}</span>
                        {item.student_status === 'SUSPENDIDO' && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                            SUSPENDIDO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mes Cubierto / Concepto */}
                    {activeTab === 'CUOTAS' ? (
                      <div style={{ textAlign: 'center', minWidth: '100px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                          Mes Cubierto
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--secondary)' }}>
                          {item.month} {item.year}
                        </strong>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', minWidth: '160px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                          Concepto / Rubro
                        </span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'block' }} title={(item as any).notes}>
                          {(item as any).item_name}
                        </strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {(item as any).rubro}
                        </span>
                      </div>
                    )}

                    {/* Progress visual */}
                    <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Progreso: {item.percent_paid}%</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>${item.total_paid} / ${expectedValue}</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${item.percent_paid}%`, 
                            background: 'linear-gradient(90deg, #f59e0b, #eab308)', 
                            borderRadius: '4px',
                            boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)'
                          }} 
                        />
                      </div>
                    </div>

                    {/* Balance / Debe */}
                    <div style={{ textAlign: 'right', minWidth: '110px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                        Resta Cobrar
                      </span>
                      <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>
                        ${item.remaining_balance.toLocaleString()}
                      </strong>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <button 
                        className="btn"
                        style={{ 
                          padding: '0.4rem 0.8rem', 
                          fontSize: '0.8rem', 
                          background: 'rgba(255,255,255,0.05)', 
                          color: '#ccc',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                        onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                      >
                        {isExpanded ? '▲ Ocultar Historial' : '▼ Ver Historial'}
                      </button>
                      <button 
                        className="btn btn-primary"
                        style={{ 
                          padding: '0.4rem 0.9rem', 
                          fontSize: '0.8rem',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 600,
                          boxShadow: '0 0 12px rgba(245,158,11,0.2)'
                        }}
                        onClick={() => handleOpenPaymentModal(item, activeTab === 'ESPECIALES')}
                      >
                        ⚡ Completar Pago
                      </button>
                    </div>
                  </div>

                  {/* Expanded History Section */}
                  {isExpanded && (
                    <div 
                      style={{ 
                        background: 'rgba(10, 10, 12, 0.5)', 
                        borderTop: '1px solid rgba(255,255,255,0.05)', 
                        padding: '1.25rem 1.5rem',
                        animation: 'fadeIn 0.25s ease-out'
                      }}
                    >
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.8rem', fontWeight: 700 }}>
                        {activeTab === 'CUOTAS' 
                          ? `📋 Historial de abonos registrados para ${item.month}`
                          : `📋 Historial de abonos registrados para ${(item as any).item_name}`}
                      </h4>
                      {item.history.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No hay abonos registrados para este concepto.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table" style={{ margin: 0, width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Fecha Pago</th>
                                <th>Rubro</th>
                                <th>Método</th>
                                <th>Recibo / Comprobante</th>
                                <th className="text-right">Monto Abonado</th>
                                <th>Detalles</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.history.map((p: any) => (
                                <tr key={p.id} className="payment-row-hover">
                                  <td style={{ fontSize: '0.82rem' }}>{p.payment_date}</td>
                                  <td><span className="category-badge">{p.rubro}</span></td>
                                  <td>{p.method}</td>
                                  <td><code>{p.receipt || '-'}</code></td>
                                  <td className="text-right" style={{ fontWeight: 600, color: 'var(--success)' }}>
                                    ${p.amount_paid.toLocaleString()}
                                  </td>
                                  <td style={{ fontSize: '0.78rem', color: 'var(--text-dim)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.info || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* POPUP MODAL FOR ADDING PAYMENT */}
      <AddPaymentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          window.location.reload();
        }}
        student={modalStudent}
        payments={modalStudent ? paymentsByStudent[modalStudent.id] || [] : []}
        initialMonth={modalInitialMonth}
        suggestedRubro={modalSuggestedRubro}
        suggestedAmount={modalSuggestedAmount}
        suggestedReceipt={modalSuggestedReceipt}
      />
    </div>
  );
}
