'use client';

import React, { useState, useMemo } from 'react';
import { 
  addCatalogItem, 
  addExtraCharge, 
  toggleExtraChargeStatus, 
  deleteExtraCharge 
} from '@/lib/actions';

interface Student {
  id: number;
  name: string;
  category: string;
  status: string;
  monthly_quota: number;
  phone: string;
  enrollment_date: string;
  period_end_date?: string;
}

interface CatalogItem {
  id: number;
  name: string;
  price: number;
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
}

interface ConceptosEspecialesUIProps {
  students: Student[];
  catalogItems: CatalogItem[];
  extraChargesByStudent: Record<number, ExtraCharge[]>;
}

export default function ConceptosEspecialesUI({
  students,
  catalogItems,
  extraChargesByStudent
}: ConceptosEspecialesUIProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Form states for extra charges
  const [ecRubro, setEcRubro] = useState('FICHAJE');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [ecAmount, setEcAmount] = useState('');
  const [ecDueDate, setEcDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ecNotes, setEcNotes] = useState('');
  const [ecStatus, setEcStatus] = useState('UNPAID');

  // Modal for global clothing catalog
  const [isAddingCatalogItem, setIsAddingCatalogItem] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogPrice, setNewCatalogPrice] = useState('');

  // Payment method prompt modal state
  const [paymentPrompt, setPaymentPrompt] = useState<{
    isOpen: boolean;
    chargeId: number | null;
    currentStatus: string;
  }>({
    isOpen: false,
    chargeId: null,
    currentStatus: ''
  });
  const [selectedMethod, setSelectedMethod] = useState('TRANSFERENCIA');

  // Saving states
  const [isSavingExtra, setIsSavingExtra] = useState(false);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);

  // Categories list for filters
  const categories = useMemo(() => {
    const cats = new Set(students.map(s => s.category));
    return Array.from(cats).sort();
  }, [students]);

  // Compute pending charges for each student
  const studentPendingCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    students.forEach(s => {
      const list = extraChargesByStudent[s.id] || [];
      const pending = list.filter(ec => ec.status !== 'PAID').length;
      counts[s.id] = pending;
    });
    return counts;
  }, [students, extraChargesByStudent]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let list = students;
    if (search) {
      const term = search.toUpperCase();
      list = list.filter(s => s.name.toUpperCase().includes(term));
    }
    if (categoryFilter !== 'ALL') {
      list = list.filter(s => s.category === categoryFilter);
    }
    return list;
  }, [students, search, categoryFilter]);

  const selectedStudent = selectedStudentId 
    ? students.find(s => s.id === selectedStudentId) 
    : null;

  const selectedCharges = selectedStudentId 
    ? (extraChargesByStudent[selectedStudentId] || []) 
    : [];

  const handleCatalogItemChange = (itemIdStr: string) => {
    setSelectedCatalogItemId(itemIdStr);
    if (itemIdStr && itemIdStr !== 'CUSTOM') {
      const item = catalogItems.find(c => c.id === parseInt(itemIdStr));
      if (item) {
        setEcAmount(item.price.toString());
      }
    } else {
      setEcAmount('');
    }
  };

  const handleAddExtraCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    let itemName = '';
    if (ecRubro === 'INDUMENTARIA') {
      if (selectedCatalogItemId === 'CUSTOM') {
        itemName = customItemName.trim();
      } else {
        const item = catalogItems.find(c => c.id === parseInt(selectedCatalogItemId));
        itemName = item ? item.name : '';
      }
    } else {
      itemName = ecRubro;
    }

    if (!itemName) {
      alert('Por favor especifique el nombre del concepto / prenda.');
      return;
    }

    const amountNum = parseFloat(ecAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }

    setIsSavingExtra(true);
    const result = await addExtraCharge({
      student_id: selectedStudentId,
      rubro: ecRubro,
      item_name: itemName.toUpperCase(),
      amount: amountNum,
      due_date: ecDueDate,
      notes: ecNotes,
      status: ecStatus
    });
    setIsSavingExtra(false);

    if (result.success) {
      setEcAmount('');
      setEcNotes('');
      setSelectedCatalogItemId('');
      setCustomItemName('');
    } else {
      alert('Error al registrar cargo extra: ' + result.error);
    }
  };

  const handleToggleClick = (chargeId: number, currentStatus: string) => {
    if (currentStatus === 'UNPAID') {
      // Open payment method modal before setting PAID
      setPaymentPrompt({
        isOpen: true,
        chargeId,
        currentStatus
      });
    } else {
      // Toggle back to UNPAID immediately
      handleToggleExtraCharge(chargeId, currentStatus);
    }
  };

  const handleToggleExtraCharge = async (chargeId: number, currentStatus: string, method?: string) => {
    const result = await toggleExtraChargeStatus(chargeId, currentStatus, method);
    if (result.success) {
      setPaymentPrompt({ isOpen: false, chargeId: null, currentStatus: '' });
    } else {
      alert('Error al cambiar estado: ' + result.error);
    }
  };

  const handleDeleteExtraCharge = async (chargeId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este cargo especial?')) return;
    const result = await deleteExtraCharge(chargeId);
    if (!result.success) {
      alert('Error al eliminar cargo: ' + result.error);
    }
  };

  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatalogName.trim();
    const priceNum = parseFloat(newCatalogPrice);

    if (!name) {
      alert('Por favor ingrese un nombre para la prenda.');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      alert('Por favor ingrese un precio válido.');
      return;
    }

    setIsSavingCatalog(true);
    const result = await addCatalogItem(name, priceNum);
    setIsSavingCatalog(false);

    if (result.success) {
      setNewCatalogName('');
      setNewCatalogPrice('');
      setIsAddingCatalogItem(false);
      alert('Prenda agregada al catálogo global exitosamente.');
    } else {
      alert('Error al agregar prenda: ' + result.error);
    }
  };

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1 className="page-title title-gradient">Conceptos Especiales</h1>
        <p className="page-subtitle">Gestión de cargos no mensuales (Fichajes, Micros, Carnets e Indumentaria)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* PANEL IZQUIERDO: LISTADO DE ALUMNOS */}
        <div className="glass table-wrapper" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <h3 className="table-title">Lista de Alumnos</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="🔍 Buscar alumno..."
                className="search-input"
                style={{ flex: 1, margin: 0 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className="filter-select"
                style={{ width: '160px', margin: 0 }}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">Categorías</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ maxHeight: '650px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th className="text-center">Pendientes</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => {
                  const pendingCount = studentPendingCounts[s.id] || 0;
                  const isSelected = s.id === selectedStudentId;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedStudentId(isSelected ? null : s.id)}
                      style={{ cursor: 'pointer', background: isSelected ? 'rgba(0, 255, 136, 0.05)' : undefined }}
                    >
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td><span className="category-badge">{s.category}</span></td>
                      <td className="text-center">
                        {pendingCount > 0 ? (
                          <span className="badge badge-danger" style={{ fontWeight: 700 }}>{pendingCount}</span>
                        ) : (
                          <span className="badge badge-success">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO: DETALLES Y GESTIÓN */}
        <div>
          {selectedStudent ? (
            <div className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{selectedStudent.name}</h2>
                  <span className="badge badge-primary" style={{ marginTop: '0.25rem' }}>{selectedStudent.category}</span>
                </div>
                <button 
                  className="btn" 
                  style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                  onClick={() => setSelectedStudentId(null)}
                >
                  Cerrar
                </button>
              </div>

              {/* FORM TO ASSIGN NEW CARGO */}
              <form onSubmit={handleAddExtraCharge} className="glass" style={{ padding: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ➕ Asignar Nuevo Cargo Especial
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Rubro</label>
                    <select 
                      className="filter-select" 
                      style={{ width: '100%', margin: 0, height: '38px' }}
                      value={ecRubro} 
                      onChange={e => {
                        setEcRubro(e.target.value);
                        setSelectedCatalogItemId('');
                        setEcAmount('');
                      }}
                    >
                      <option value="FICHAJE">FICHAJE</option>
                      <option value="CARNET">CARNET</option>
                      <option value="MICRO">MICRO</option>
                      <option value="INDUMENTARIA">INDUMENTARIA</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Vencimiento</label>
                    <input 
                      type="date" 
                      className="search-input" 
                      style={{ width: '100%', margin: 0, padding: '0.35rem 0.6rem', height: '38px', background: 'rgba(0,0,0,0.2)' }} 
                      value={ecDueDate} 
                      onChange={e => setEcDueDate(e.target.value)} 
                    />
                  </div>
                </div>

                {ecRubro === 'INDUMENTARIA' && (
                  <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Seleccionar Prenda</label>
                      <select 
                        className="filter-select" 
                        style={{ width: '100%', margin: 0, height: '38px' }}
                        value={selectedCatalogItemId} 
                        onChange={e => handleCatalogItemChange(e.target.value)}
                      >
                        <option value="">-- Seleccionar Prenda --</option>
                        {catalogItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} (${item.price.toLocaleString()})</option>
                        ))}
                        <option value="CUSTOM">+ Otra prenda (personalizada)...</option>
                      </select>
                    </div>
                    
                    <button 
                      type="button" 
                      className="btn glass-hover" 
                      style={{ fontSize: '0.75rem', height: '38px', whiteSpace: 'nowrap', border: '1px solid rgba(0, 255, 136, 0.2)', color: 'var(--primary)', padding: '0 0.8rem' }}
                      onClick={() => setIsAddingCatalogItem(true)}
                    >
                      ⚙️ Catálogo
                    </button>
                  </div>
                )}

                {ecRubro === 'INDUMENTARIA' && selectedCatalogItemId === 'CUSTOM' && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Prenda Personalizada</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Camiseta Oficial Titular" 
                      className="search-input" 
                      style={{ width: '100%', margin: 0, height: '38px' }} 
                      value={customItemName} 
                      onChange={e => setCustomItemName(e.target.value)} 
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Monto ($)</label>
                    <input 
                      type="number" 
                      placeholder="Monto" 
                      className="search-input" 
                      style={{ width: '100%', margin: 0, height: '38px' }} 
                      value={ecAmount} 
                      onChange={e => setEcAmount(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Estado Inicial</label>
                    <select 
                      className="filter-select" 
                      style={{ width: '100%', margin: 0, height: '38px' }}
                      value={ecStatus} 
                      onChange={e => setEcStatus(e.target.value)}
                    >
                      <option value="UNPAID">PENDIENTE</option>
                      <option value="PAID">PAGADO</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Detalle / Observaciones</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Talle L, pago en 2 cuotas, etc." 
                    className="search-input" 
                    style={{ width: '100%', margin: 0, height: '38px' }} 
                    value={ecNotes} 
                    onChange={e => setEcNotes(e.target.value)} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary glass-hover" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, height: '38px', boxShadow: '0 0 15px var(--primary-glow)' }}
                  disabled={isSavingExtra}
                >
                  {isSavingExtra ? 'Registrando...' : '⚡ Confirmar y Registrar'}
                </button>
              </form>

              {/* LIST OF CHARGES */}
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cargos Especiales Registrados ({selectedCharges.length})
                </h4>
                {selectedCharges.length === 0 ? (
                  <div className="glass" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Este alumno no tiene conceptos especiales registrados.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {selectedCharges.map(charge => (
                      <div 
                        key={charge.id}
                        className="glass" 
                        style={{ 
                          padding: '0.75rem', 
                          border: '1px solid var(--card-border)', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          background: charge.status === 'PAID' ? 'rgba(0, 255, 136, 0.02)' : 'rgba(239, 68, 68, 0.02)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }}>{charge.rubro}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{charge.item_name}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            Vencimiento: {charge.due_date} {charge.notes && `· Notas: ${charge.notes}`}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 700, color: charge.status === 'PAID' ? 'var(--success)' : 'var(--danger)', fontSize: '0.9rem' }}>
                            ${charge.amount.toLocaleString()}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => handleToggleClick(charge.id, charge.status)}
                            className="btn"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.7rem',
                              background: charge.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: charge.status === 'PAID' ? 'var(--success)' : 'var(--danger)',
                              border: `1px solid ${charge.status === 'PAID' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}
                          >
                            {charge.status === 'PAID' ? '✓ Pagado' : '✗ Impago'}
                          </button>

                          <button 
                            type="button"
                            onClick={() => handleDeleteExtraCharge(charge.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6 }}
                            title="Eliminar cargo"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💎</span>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Selecciona un Alumno</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px' }}>Selecciona un alumno del panel izquierdo para asignarle conceptos o gestionar sus pagos pendientes.</p>
            </div>
          )}
        </div>
      </div>

      {/* PAYMENT METHOD SELECTION PROMPT MODAL */}
      {paymentPrompt.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass" style={{ width: '400px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>💵 Seleccionar Método de Pago</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>Por favor selecciona el método por el cual el alumno realiza este pago para registrarlo en el flujo de caja.</p>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Método de Pago</label>
              <select 
                className="filter-select" 
                style={{ width: '100%', margin: 0, height: '40px' }}
                value={selectedMethod}
                onChange={e => setSelectedMethod(e.target.value)}
              >
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="MP">MERCADO PAGO</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setPaymentPrompt({ isOpen: false, chargeId: null, currentStatus: '' })}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary glass-hover" 
                style={{ flex: 1, fontWeight: 600, boxShadow: '0 0 10px var(--primary-glow)' }}
                onClick={() => {
                  if (paymentPrompt.chargeId) {
                    handleToggleExtraCharge(paymentPrompt.chargeId, paymentPrompt.currentStatus, selectedMethod);
                  }
                }}
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL CATALOG MANAGER MODAL */}
      {isAddingCatalogItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass" style={{ width: '450px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>🛍️ Catálogo Global de Indumentaria</h3>
              <button 
                type="button"
                onClick={() => setIsAddingCatalogItem(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Form to add item */}
            <form onSubmit={handleAddCatalogItem} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Agregar Nueva Prenda</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Nombre prenda (Ej: Shorts)" 
                  className="search-input" 
                  style={{ flex: 2, margin: 0 }} 
                  value={newCatalogName} 
                  onChange={e => setNewCatalogName(e.target.value)} 
                />
                <input 
                  type="number" 
                  placeholder="Precio ($)" 
                  className="search-input" 
                  style={{ flex: 1, margin: 0 }} 
                  value={newCatalogPrice} 
                  onChange={e => setNewCatalogPrice(e.target.value)} 
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary glass-hover" 
                style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                disabled={isSavingCatalog}
              >
                {isSavingCatalog ? 'Guardando...' : '💾 Guardar para todos'}
              </button>
            </form>

            {/* List of items */}
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Prendas Registradas</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {catalogItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem' }}>No hay prendas en el catálogo.</div>
              ) : (
                catalogItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>${item.price.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
            
            <button 
              type="button" 
              className="btn" 
              style={{ width: '100%', marginTop: '1.25rem', background: 'rgba(255, 255, 255, 0.05)' }} 
              onClick={() => setIsAddingCatalogItem(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
