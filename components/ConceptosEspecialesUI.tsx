'use client';

import React, { useState, useMemo } from 'react';
import { 
  addCatalogItem, 
  addExtraCharge, 
  addExtraChargePayment,
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

interface PaymentMovement {
  id: number;
  payment_date: string;
  amount_paid: number;
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
  payment_method?: string;
  total_paid?: number;
  remaining_balance?: number;
  movements?: PaymentMovement[];
  movements_count?: number;
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
  const [rubroFilter, setRubroFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Available rubros
  const availableRubros = useMemo(() => {
    const set = new Set<string>(['FICHAJE', 'INDUMENTARIA', 'CARNET', 'MICRO']);
    Object.values(extraChargesByStudent).forEach(charges => {
      charges.forEach(ec => {
        if (ec.rubro) set.add(ec.rubro);
      });
    });
    return Array.from(set).sort();
  }, [extraChargesByStudent]);

  // Form states for extra charges
  const [ecRubro, setEcRubro] = useState('FICHAJE');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [ecAmount, setEcAmount] = useState('');
  const [ecDueDate, setEcDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ecNotes, setEcNotes] = useState('');
  const [ecStatus, setEcStatus] = useState('UNPAID');
  const [ecMethod, setEcMethod] = useState('TRANSFERENCIA');

  // Modal for global clothing catalog
  const [isAddingCatalogItem, setIsAddingCatalogItem] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogPrice, setNewCatalogPrice] = useState('');

  // Payment installment modal state
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    charge: ExtraCharge | null;
    studentName: string;
    amountToPay: string;
    paymentDate: string;
    method: string;
    notes: string;
  }>({
    isOpen: false,
    charge: null,
    studentName: '',
    amountToPay: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'TRANSFERENCIA',
    notes: ''
  });

  // Saving states
  const [isSavingExtra, setIsSavingExtra] = useState(false);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

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
      const pending = list.filter(ec => (ec.remaining_balance ?? (ec.status === 'PAID' ? 0 : ec.amount)) > 0).length;
      counts[s.id] = pending;
    });
    return counts;
  }, [students, extraChargesByStudent]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let list = students;
    if (search) {
      const term = search.toUpperCase();
      list = list.filter(s => {
        const nameMatch = s.name.toUpperCase().includes(term);
        const charges = extraChargesByStudent[s.id] || [];
        const chargeMatch = charges.some(ec => 
          (ec.rubro || '').toUpperCase().includes(term) ||
          (ec.item_name || '').toUpperCase().includes(term) ||
          (ec.notes || '').toUpperCase().includes(term)
        );
        return nameMatch || chargeMatch;
      });
    }
    if (categoryFilter !== 'ALL') {
      list = list.filter(s => s.category === categoryFilter);
    }
    if (rubroFilter !== 'ALL') {
      list = list.filter(s => {
        const charges = extraChargesByStudent[s.id] || [];
        return charges.some(ec => ec.rubro === rubroFilter);
      });
    }
    if (statusFilter !== 'ALL') {
      list = list.filter(s => {
        const charges = extraChargesByStudent[s.id] || [];
        if (statusFilter === 'PENDIENTE') {
          return charges.some(ec => (ec.remaining_balance ?? (ec.status === 'PAID' ? 0 : ec.amount)) > 0);
        } else if (statusFilter === 'PAID') {
          return charges.length > 0 && charges.every(ec => (ec.remaining_balance ?? 0) === 0);
        } else if (statusFilter === 'CON_CARGOS') {
          return charges.length > 0;
        }
        return true;
      });
    }
    return list;
  }, [students, search, categoryFilter, rubroFilter, statusFilter, extraChargesByStudent]);

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
      status: ecStatus,
      method: ecStatus === 'PAID' ? ecMethod : undefined
    });
    setIsSavingExtra(false);

    if (result.success) {
      setEcAmount('');
      setEcNotes('');
      setSelectedCatalogItemId('');
      setCustomItemName('');
      setEcStatus('UNPAID');
      setEcMethod('TRANSFERENCIA');
    } else {
      alert('Error al registrar cargo extra: ' + result.error);
    }
  };

  const handleOpenPaymentModal = (charge: ExtraCharge) => {
    const rem = charge.remaining_balance !== undefined ? charge.remaining_balance : charge.amount;
    setPaymentModal({
      isOpen: true,
      charge,
      studentName: selectedStudent ? selectedStudent.name : 'Alumno',
      amountToPay: rem > 0 ? rem.toString() : charge.amount.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'TRANSFERENCIA',
      notes: ''
    });
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal.charge) return;

    const amountNum = parseFloat(paymentModal.amountToPay);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor ingrese un monto a abonar válido mayor a cero.');
      return;
    }

    setIsSavingPayment(true);
    const result = await addExtraChargePayment(paymentModal.charge.id, {
      amount_paid: amountNum,
      payment_date: paymentModal.paymentDate,
      method: paymentModal.method,
      notes: paymentModal.notes.trim()
    });
    setIsSavingPayment(false);

    if (result.success) {
      setPaymentModal({
        isOpen: false,
        charge: null,
        studentName: '',
        amountToPay: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'TRANSFERENCIA',
        notes: ''
      });
    } else {
      alert('Error al registrar pago: ' + result.error);
    }
  };

  const handleToggleExtraCharge = async (chargeId: number, currentStatus: string, method?: string) => {
    const result = await toggleExtraChargeStatus(chargeId, currentStatus, method);
    if (!result.success) {
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
        <p className="page-subtitle">Gestión de cargos no mensuales, pagos parciales y movimientos (Fichajes, Micros, Carnets e Indumentaria)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* PANEL IZQUIERDO: LISTADO DE ALUMNOS */}
        <div className="glass table-wrapper" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <h3 className="table-title">Lista de Alumnos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, concepto..."
                className="search-input"
                style={{ margin: 0 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select
                className="filter-select"
                style={{ margin: 0 }}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="ALL">Todas las categorías</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <select
                className="filter-select"
                style={{ margin: 0 }}
                value={rubroFilter}
                onChange={e => setRubroFilter(e.target.value)}
              >
                <option value="ALL">Todos los Rubros</option>
                {availableRubros.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                className="filter-select"
                style={{ margin: 0 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDIENTE">Con Impagos / Pendientes</option>
                <option value="PAID">Al día / Todo Pagado</option>
                <option value="CON_CARGOS">Alumnos con Cargos</option>
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
                      <td style={{ fontWeight: 600 }}>
                        <div>{s.name}</div>
                        {extraChargesByStudent[s.id] && extraChargesByStudent[s.id].length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                            {Array.from(new Set(extraChargesByStudent[s.id].map(ec => ec.rubro))).map(r => (
                              <span key={r} style={{ fontSize: '0.58rem', padding: '0.05rem 0.3rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-dim)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
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

        {/* PANEL DERECHO: DETALLE DEL ALUMNO Y GESTIÓN DE CARGOS */}
        <div>
          {selectedStudent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* HEADER INFO */}
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

                <div style={{ display: 'grid', gridTemplateColumns: ecStatus === 'PAID' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                      <option value="PAID">PAGADO TOTAL</option>
                    </select>
                  </div>

                  {ecStatus === 'PAID' && (
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Método</label>
                      <select 
                        className="filter-select" 
                        style={{ width: '100%', margin: 0, height: '38px' }}
                        value={ecMethod} 
                        onChange={e => setEcMethod(e.target.value)}
                      >
                        <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                        <option value="EFECTIVO">EFECTIVO</option>
                        <option value="MP">MP</option>
                        <option value="OTRO">OTRO</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Detalle / Observaciones</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Talle L, seña de $10.000, etc." 
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
                    {selectedCharges.map(charge => {
                      const totalPaid = charge.total_paid || 0;
                      const amount = charge.amount || 0;
                      const remaining = charge.remaining_balance !== undefined ? charge.remaining_balance : Math.max(0, amount - totalPaid);
                      const isFullyPaid = charge.status === 'PAID' || (totalPaid >= amount && amount > 0);
                      const isPartial = !isFullyPaid && totalPaid > 0;
                      const movements = charge.movements || [];

                      return (
                        <div 
                          key={charge.id}
                          className="glass" 
                          style={{ 
                            padding: '0.85rem', 
                            border: '1px solid var(--card-border)', 
                            background: isFullyPaid ? 'rgba(0, 255, 136, 0.02)' : isPartial ? 'rgba(245, 158, 11, 0.02)' : 'rgba(239, 68, 68, 0.02)',
                            borderRadius: 'var(--radius-md)'
                          }}
                        >
                          {/* TOP BAR OF THE CHARGE */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span className="badge badge-secondary" style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}>{charge.rubro}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{charge.item_name}</span>
                                {isFullyPaid ? (
                                  <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>✅ Pagado Completo</span>
                                ) : isPartial ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>⏳ Pago Parcial</span>
                                ) : (
                                  <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>✗ Impago</span>
                                )}
                              </div>

                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span>📅 Vence: {charge.due_date}</span>
                                {charge.notes && <span>· 📝 {charge.notes}</span>}
                              </div>
                            </div>
                            
                            {/* ACTION BUTTONS */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {!isFullyPaid ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPaymentModal(charge)}
                                  className="btn btn-primary glass-hover"
                                  style={{
                                    padding: '0.3rem 0.7rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    boxShadow: '0 0 10px var(--primary-glow)'
                                  }}
                                >
                                  ➕ Abonar Saldo (${remaining.toLocaleString()})
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleExtraCharge(charge.id, 'PAID')}
                                  className="btn"
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.7rem',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: 'var(--success)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                  }}
                                  title="Click para revertir a impago si fue un error"
                                >
                                  ✓ Cobrado
                                </button>
                              )}

                              <button 
                                type="button"
                                onClick={() => handleDeleteExtraCharge(charge.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6, padding: '0.2rem' }}
                                title="Eliminar cargo"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* FINANCIAL BREAKDOWN */}
                          <div style={{ 
                            marginTop: '0.6rem', 
                            padding: '0.5rem 0.75rem', 
                            background: 'rgba(0,0,0,0.25)', 
                            borderRadius: 'var(--radius-sm)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.5rem',
                            fontSize: '0.78rem'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Monto Total:</span>
                              <span style={{ fontWeight: 700, color: '#fff' }}>${amount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Total Abonado:</span>
                              <span style={{ fontWeight: 700, color: totalPaid > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                ${totalPaid.toLocaleString()} {movements.length > 0 ? `(${movements.length} pago${movements.length > 1 ? 's' : ''})` : ''}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Saldo Pendiente:</span>
                              <span style={{ fontWeight: 800, color: remaining > 0 ? '#f59e0b' : 'var(--success)' }}>
                                ${remaining.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* PAYMENT MOVEMENTS HISTORY (IF ANY) */}
                          {movements.length > 0 && (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                📋 Historial de Movimientos ({movements.length}):
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {movements.map((m, idx) => (
                                  <div key={m.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span>📅 {m.payment_date}</span>
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        padding: '0.05rem 0.3rem', 
                                        borderRadius: '3px',
                                        background: m.method === 'EFECTIVO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                                        color: m.method === 'EFECTIVO' ? 'var(--success)' : '#60a5fa'
                                      }}>
                                        {m.method === 'EFECTIVO' ? '💵 EFECTIVO' : '💳 ' + m.method}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      {m.info && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.info}</span>}
                                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>+${m.amount_paid.toLocaleString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💎</span>
              <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Selecciona un Alumno</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px' }}>Selecciona un alumno del panel izquierdo para asignarle conceptos o gestionar sus pagos y movimientos parciales.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PARA REGISTRAR PAGO / ABONO DE SALDO */}
      {paymentModal.isOpen && paymentModal.charge && (
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
          <div className="glass" style={{ width: '440px', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>💵 Registrar Abono de Concepto</h3>
              <button 
                type="button" 
                onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false, charge: null }))}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)' }}>{paymentModal.studentName}</p>
              <p style={{ margin: '0.2rem 0 0 0', color: '#fff' }}>{paymentModal.charge.item_name} ({paymentModal.charge.rubro})</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                <span>Total Concepto: ${(paymentModal.charge.amount || 0).toLocaleString()}</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                  Resta: ${(paymentModal.charge.remaining_balance !== undefined ? paymentModal.charge.remaining_balance : paymentModal.charge.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPayment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Monto a Abonar en este Movimiento ($)
                </label>
                <input 
                  type="number"
                  required
                  min="1"
                  step="any"
                  className="search-input"
                  style={{ width: '100%', margin: 0, height: '40px', fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}
                  value={paymentModal.amountToPay}
                  onChange={e => setPaymentModal(prev => ({ ...prev, amountToPay: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Método de Pago
                  </label>
                  <select 
                    className="filter-select"
                    style={{ width: '100%', margin: 0, height: '40px' }}
                    value={paymentModal.method}
                    onChange={e => setPaymentModal(prev => ({ ...prev, method: e.target.value }))}
                  >
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="MP">MERCADO PAGO</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Fecha de Pago
                  </label>
                  <input 
                    type="date"
                    required
                    className="search-input"
                    style={{ width: '100%', margin: 0, height: '40px', padding: '0.35rem 0.6rem', background: 'rgba(0,0,0,0.2)' }}
                    value={paymentModal.paymentDate}
                    onChange={e => setPaymentModal(prev => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Detalle / Comprobante / Observaciones
                </label>
                <input 
                  type="text"
                  placeholder="Ej: Pago 1 de 2, transf N° 1823910, etc."
                  className="search-input"
                  style={{ width: '100%', margin: 0, height: '40px' }}
                  value={paymentModal.notes}
                  onChange={e => setPaymentModal(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, height: '40px' }}
                  onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false, charge: null }))}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1.2, height: '40px', fontWeight: 700, boxShadow: '0 0 15px var(--primary-glow)' }}
                  disabled={isSavingPayment}
                >
                  {isSavingPayment ? 'Guardando...' : '✓ Confirmar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL PARA CREAR PRENDA EN CATÁLOGO */}
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
          <div className="glass" style={{ width: '400px', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>👕 Nueva Prenda en Catálogo</h3>
            
            <form onSubmit={handleAddCatalogItem}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Nombre de la Prenda</label>
                <input 
                  type="text" 
                  placeholder="Ej: Camiseta Oficial 2026" 
                  className="search-input" 
                  style={{ width: '100%', margin: 0, height: '40px' }}
                  value={newCatalogName}
                  onChange={e => setNewCatalogName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Precio Oficial ($)</label>
                <input 
                  type="number" 
                  placeholder="Ej: 25000" 
                  className="search-input" 
                  style={{ width: '100%', margin: 0, height: '40px' }}
                  value={newCatalogPrice}
                  onChange={e => setNewCatalogPrice(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setIsAddingCatalogItem(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, fontWeight: 700 }}
                  disabled={isSavingCatalog}
                >
                  {isSavingCatalog ? 'Guardando...' : 'Guardar Prenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
