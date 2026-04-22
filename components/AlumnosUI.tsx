'use client';

import React, { useState, useMemo } from 'react';
import AddStudentModal from './AddStudentModal';
import AddPaymentModal from './AddPaymentModal';
import EditPaymentModal from './EditPaymentModal';
import { deleteStudent, deletePayment } from '@/lib/actions';

interface Student {
  id: number;
  name: string;
  category: string;
  group_name: string;
  gender: string | null;
  team: string | null;
  status: string;
  notes: string;
  monthly_quota: number;
  phone: string;
  payment_count: number;
  total_paid: number;
  total_balance: number;
  months_paid: number;
  months_unpaid: number;
  months_partial: number;
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
  receipt: string;
  balance: number;
  delay_days: number;
  info: string;
}

interface AlumnosUIProps {
  students: Student[];
  statusMap: Record<number, Record<string, string>>;
  paymentsByStudent: Record<number, Payment[]>;
  categories: string[];
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export default function AlumnosUI({ students, statusMap, paymentsByStudent, categories }: AlumnosUIProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteStudent = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${name}? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    setIsDeleting(true);
    const result = await deleteStudent(id);
    setIsDeleting(false);
    
    if (result.success) {
      setSelectedStudent(null);
    } else {
      alert('Error al eliminar alumno: ' + result.error);
    }
  };

  const handleDeletePayment = async (id: number) => {
      if (!confirm('¿Estás seguro de que deseas eliminar este pago?')) return;
      const result = await deletePayment(id);
      if (!result.success) alert('Error: ' + result.error);
  };

  const handleEditPayment = (payment: Payment) => {
      setEditingPayment(payment);
      setIsEditPaymentModalOpen(true);
  };

  const handleWhatsApp = (student: Student) => {
      const pendingMonths = MONTHS.filter(m => (statusMap[student.id] || {})[m] === 'UNPAID' || (statusMap[student.id] || {})[m] === 'PARTIAL');
      if (pendingMonths.length === 0) {
          alert('El alumno está al día.');
          return;
      }

      const currentMonth = pendingMonths[0];
      const quota = student.monthly_quota || 5000;
      const message = `Hola ${student.name}, te recordamos que tenés pendiente el pago de ${currentMonth} por un valor de $${quota.toLocaleString()}. ¡Muchas gracias!`;
      
      const phone = student.phone || prompt('Ingrese el número de WhatsApp (sin +):');
      if (!phone) return;

      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const filtered = useMemo(() => {
    let result = students;
    if (search) {
      const term = search.toUpperCase();
      result = result.filter(s => s.name.toUpperCase().includes(term));
    }
    if (categoryFilter !== 'ALL') {
      result = result.filter(s => s.category === categoryFilter);
    }
    return result;
  }, [students, search, categoryFilter]);

  const selected = selectedStudent ? students.find(s => s.id === selectedStudent) : null;
  const selectedPayments = selectedStudent ? (paymentsByStudent[selectedStudent] || []) : [];
  const selectedStatus = selectedStudent ? (statusMap[selectedStudent] || {}) : {};

  const avgDelay = useMemo(() => {
    if (selectedPayments.length === 0) return 0;
    const totalDelay = selectedPayments.reduce((sum, p) => sum + (p.delay_days || 0), 0);
    return Math.round(totalDelay / selectedPayments.length);
  }, [selectedPayments]);

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1 className="page-title title-gradient">Alumnos</h1>
        <p className="page-subtitle">Gestión y ficha individual de cada alumno</p>
      </div>

      {/* FILTERS */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre..."
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">Todas las categorías</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="filter-count">
          {filtered.length} de {students.length} alumnos
        </span>
        <button 
          className="btn btn-primary glass-hover" 
          style={{ marginLeft: '1rem', boxShadow: '0 0 20px var(--primary-glow)' }}
          onClick={() => setIsAddModalOpen(true)}
        >
          ✨ Nuevo Alumno
        </button>
      </div>

      <AddStudentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        categories={categories}
      />

      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        student={selected ? { id: selected.id, name: selected.name, category: selected.category, monthly_quota: selected.monthly_quota } : null}
      />

      <EditPaymentModal
        isOpen={isEditPaymentModalOpen}
        onClose={() => setIsEditPaymentModalOpen(false)}
        payment={editingPayment}
        studentName={selected?.name}
      />

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* STUDENT LIST */}
        <div className="glass table-wrapper">
          <div className="table-header">
            <h3 className="table-title">Lista de Alumnos</h3>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th className="text-center">Pagos</th>
                  <th className="text-right">Total Pagado</th>
                  <th className="text-center">Estado de Pago</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStudent(s.id === selectedStudent ? null : s.id)}
                    style={{ cursor: 'pointer', background: s.id === selectedStudent ? 'rgba(0, 255, 136, 0.05)' : undefined }}
                  >
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><span className="category-badge">{s.category}</span></td>
                    <td className="text-center">{s.payment_count}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {s.total_paid > 0 ? `$${(s.total_paid || 0).toLocaleString()}` : '-'}
                    </td>
                    <td className="text-center">
                      {s.months_unpaid > 2
                        ? <span className="badge badge-danger">Moroso</span>
                        : s.months_unpaid > 0
                          ? <span className="badge badge-warning">Pendiente</span>
                          : s.payment_count > 0
                            ? <span className="badge badge-success">Al día</span>
                            : <span className="badge badge-secondary">Sin datos</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* STUDENT FICHA */}
        {selected && (
          <div className="glass student-ficha" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="student-ficha-header">
              <div style={{ flex: 1 }}>
                <h2 className="student-name">{selected.name}</h2>
                <div className="student-meta" style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span className="badge badge-primary">{selected.category}</span>
                  {selected.group_name && <span className="badge badge-secondary">{selected.group_name}</span>}
                  {selected.team && <span className="badge badge-secondary">Equipo {selected.team}</span>}
                  {selected.gender && <span className="badge badge-secondary">{selected.gender === 'M' ? '♂ Masc' : '♀ Fem'}</span>}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary glass-hover" 
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', boxShadow: '0 0 15px var(--primary-glow)' }}
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    💰 Registrar Pago
                  </button>
                  <button 
                    className="btn glass-hover" 
                    style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.4rem 0.8rem', 
                        background: 'rgba(37, 211, 102, 0.1)', 
                        borderColor: 'rgba(37, 211, 102, 0.3)',
                        color: '#25D366'
                    }}
                    onClick={() => handleWhatsApp(selected)}
                  >
                    📱 Notificar Deuda
                  </button>
                  <button 
                    className="btn btn-secondary glass-hover" 
                    style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.4rem 0.8rem', 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      color: '#ffbbbb'
                    }}
                    onClick={() => handleDeleteStudent(selected.id, selected.name)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Eliminando...' : '🗑️'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* DETAIL GRID */}
            <div className="student-detail-grid" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
              <div className="detail-item glass" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <span className="detail-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.2rem' }}>Total Pagado</span>
                <span className="detail-value text-success" style={{ fontWeight: 700 }}>${(selected.total_paid || 0).toLocaleString()}</span>
              </div>
              <div className="detail-item glass" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <span className="detail-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.2rem' }}>Saldo Deuda</span>
                <span className={`detail-value ${(selected.total_balance || 0) < 0 ? 'text-danger' : 'text-success'}`} style={{ fontWeight: 700 }}>
                  ${(selected.total_balance || 0).toLocaleString()}
                </span>
              </div>
              <div className="detail-item glass" style={{ padding: '0.75rem', textAlign: 'center' }}>
                <span className="detail-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.2rem' }}>Días Demora Avg.</span>
                <span className={`detail-value ${avgDelay > 0 ? 'text-warning' : 'text-success'}`} style={{ fontWeight: 700 }}>
                  {avgDelay} d
                </span>
              </div>
            </div>

            {/* MONTHLY MATRIX (for this student) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Estado Mensual (Vencimiento: día 10)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.3rem' }}>
                {MONTHS.map(m => {
                  const st = selectedStatus[m] || 'UNPAID';
                  const cls = st === 'PAID' ? 'status-paid' : st === 'PARTIAL' ? 'status-partial' : 'status-unpaid';
                  return (
                    <div key={m} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        {m.substring(0, 3)}
                      </div>
                      <div className={`matrix-cell ${cls}`} style={{ width: '100%', height: '28px' }}>
                        {st === 'PAID' ? '✓' : st === 'PARTIAL' ? '~' : '✗'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PAYMENT HISTORY */}
            {selectedPayments.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Historial de Pagos ({selectedPayments.length})
                </h4>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {selectedPayments.map(p => (
                    <div
                      key={p.id}
                      className="payment-row-hover"
                      style={{
                        padding: '0.75rem', borderBottom: '1px solid var(--card-border)',
                        fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.2rem',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700 }}>${(p.amount_paid || 0).toLocaleString()}</span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className="text-dim" style={{ fontSize: '0.75rem' }}>{p.payment_date}</span>
                            <button onClick={() => handleEditPayment(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.6 }}>✏️</button>
                            <button onClick={() => handleDeletePayment(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.6 }}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-dim">{p.rubro} · Cuota {p.month_covered ? p.month_covered.substring(0, 7) : '-'}</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {p.delay_days !== 0 && (
                            <span style={{ fontSize: '0.65rem', color: p.delay_days > 0 ? 'var(--warning)' : 'var(--success)' }}>
                              {p.delay_days > 0 ? `+${p.delay_days}d` : `${Math.abs(p.delay_days)}d adelanto`}
                            </span>
                          )}
                          <span className={`badge ${p.estado === 'ABONADA' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.55rem' }}>
                            {p.estado}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTES */}
            {selected.notes && (
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                background: 'rgba(0, 210, 255, 0.05)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid rgba(0, 210, 255, 0.15)',
                animation: 'fadeIn 0.5s ease-out'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                  ℹ️ Notas y Observaciones
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  {selected.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
          .payment-row-hover:hover {
              background: rgba(255, 255, 255, 0.02);
          }
          .payment-row-hover button:hover {
              opacity: 1 !important;
              transform: scale(1.1);
          }
      `}</style>
    </div>
  );
}
