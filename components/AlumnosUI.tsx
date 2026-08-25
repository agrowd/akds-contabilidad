'use client';

import React, { useState, useMemo } from 'react';
import AddStudentModal from './AddStudentModal';
import AddPaymentModal from './AddPaymentModal';
import EditPaymentModal from './EditPaymentModal';
import EditStudentModal from './EditStudentModal';
import { 
  deleteStudent, 
  deletePayment, 
  updateStudent, 
  toggleMonthPayment,
  addCatalogItem,
  addExtraCharge,
  addExtraChargePayment,
  toggleExtraChargeStatus,
  deleteExtraCharge
} from '@/lib/actions';
import { exportToExcel, exportToPDF } from '@/lib/export';

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
  enrollment_date: string;
  period_end_date?: string;
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

interface AlumnosUIProps {
  students: Student[];
  statusMap: Record<number, Record<string, string>>;
  disabledReasonsMap?: Record<number, Record<string, string>>;
  paymentsByStudent: Record<number, Payment[]>;
  categories: string[];
  catalogItems?: CatalogItem[];
  extraChargesByStudent?: Record<number, ExtraCharge[]>;
  initialSelectedStudentId?: number;
}

const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

export default function AlumnosUI({ 
  students, 
  statusMap, 
  disabledReasonsMap = {},
  paymentsByStudent, 
  categories,
  catalogItems = [],
  extraChargesByStudent = {},
  initialSelectedStudentId
}: AlumnosUIProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [rubroFilter, setRubroFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(initialSelectedStudentId || null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tabs for the student card details
  const [activeTab, setActiveTab] = useState<'CUOTAS' | 'ESPECIALES'>('CUOTAS');

  // React to initialSelectedStudentId changes
  React.useEffect(() => {
    if (initialSelectedStudentId !== undefined && initialSelectedStudentId !== null) {
      setSelectedStudent(initialSelectedStudentId);
    }
  }, [initialSelectedStudentId]);
  
  // Extra charge form state
  const [ecRubro, setEcRubro] = useState('FICHAJE');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState('');
  const [ecAmount, setEcAmount] = useState('');
  const [ecDueDate, setEcDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [ecNotes, setEcNotes] = useState('');
  const [ecStatus, setEcStatus] = useState('UNPAID');
  const [ecMethod, setEcMethod] = useState('TRANSFERENCIA');

  // Catalog item form state
  const [isAddingCatalogItem, setIsAddingCatalogItem] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [newCatalogPrice, setNewCatalogPrice] = useState('');

  // Saving states
  const [isSavingExtra, setIsSavingExtra] = useState(false);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);

  // Disabled Month modal state
  const [disabledModal, setDisabledModal] = useState<{
    isOpen: boolean;
    studentId: number | null;
    monthName: string;
    reason: string;
  }>({
    isOpen: false,
    studentId: null,
    monthName: '',
    reason: ''
  });

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
  const [selectedMethod, setSelectedMethod] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'MP' | 'OTRO'>('TRANSFERENCIA');

  // Charge payment installment modal state
  const [chargePaymentModal, setChargePaymentModal] = useState<{
    isOpen: boolean;
    charge: ExtraCharge | null;
    amountToPay: string;
    paymentDate: string;
    method: string;
    notes: string;
  }>({
    isOpen: false,
    charge: null,
    amountToPay: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'TRANSFERENCIA',
    notes: ''
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);

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

  const handleToggleMonth = async (studentId: number, month: string, currentStatus: string) => {
      if (currentStatus === 'SUSPENDIDO') return; // Cannot toggle suspended months
      
      if (currentStatus === 'DESHABILITADO') {
        const reason = (disabledReasonsMap[studentId] || {})[month] || '';
        setDisabledModal({
          isOpen: true,
          studentId,
          monthName: month,
          reason
        });
        return;
      }
      
      const nextStatusMap: Record<string, string> = {
          'UNPAID': 'PAID',
          'PAID': 'PARTIAL',
          'PARTIAL': 'DESHABILITADO',
          'DESHABILITADO': 'UNPAID',
          'MOROSO': 'PAID' // Pseudo-status from UI maps to UNPAID in DB
      };
      
      let actualCurrent = currentStatus;
      if (currentStatus === 'MOROSO') actualCurrent = 'UNPAID';

      const newStatus = nextStatusMap[actualCurrent] || 'PAID';
      
      if (newStatus === 'DESHABILITADO') {
        setDisabledModal({
          isOpen: true,
          studentId,
          monthName: month,
          reason: ''
        });
        return;
      }
      
      const currentYear = new Date().getFullYear().toString();
      
      const result = await toggleMonthPayment(studentId, currentYear, month, newStatus);
      if (!result.success) {
          alert('Error al actualizar: ' + result.error);
      }
  };

  const handleToggleSuspend = async (student: Student) => {
      const newStatus = student.status === 'SUSPENDIDO' ? 'ACTIVE' : 'SUSPENDIDO';
      if (!confirm(`¿Estás seguro de que deseas cambiar el estado de ${student.name} a ${newStatus}?`)) return;
      
      const result = await updateStudent(student.id, { status: newStatus });
      if (!result.success) {
          alert('Error: ' + result.error);
      }
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
    if (!selectedStudent) return;
    
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
      student_id: selectedStudent,
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
      // Reset form fields
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

  const handleOpenChargePaymentModal = (charge: ExtraCharge) => {
    const rem = charge.remaining_balance !== undefined ? charge.remaining_balance : charge.amount;
    setChargePaymentModal({
      isOpen: true,
      charge,
      amountToPay: rem > 0 ? rem.toString() : charge.amount.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'TRANSFERENCIA',
      notes: ''
    });
  };

  const handleConfirmChargePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargePaymentModal.charge) return;

    const amountNum = parseFloat(chargePaymentModal.amountToPay);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor ingrese un monto válido a abonar mayor a cero.');
      return;
    }

    setIsSavingPayment(true);
    const result = await addExtraChargePayment(chargePaymentModal.charge.id, {
      amount_paid: amountNum,
      payment_date: chargePaymentModal.paymentDate,
      method: chargePaymentModal.method,
      notes: chargePaymentModal.notes.trim()
    });
    setIsSavingPayment(false);

    if (result.success) {
      setChargePaymentModal({
        isOpen: false,
        charge: null,
        amountToPay: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'TRANSFERENCIA',
        notes: ''
      });
    } else {
      alert('Error al registrar pago de cargo: ' + result.error);
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
    if (!confirm('¿Estás seguro de que deseas eliminar este cargo extra?')) return;
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

  const computedStudents = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentDay = new Date().getDate();
    const currentYearStr = new Date().getFullYear().toString();

    return students.map(s => {
      const studentStatus = statusMap[s.id] || {};
      let monthsPaid = 0;
      let monthsUnpaid = 0;
      let monthsPartial = 0;
      
      const startYearMonth = s.enrollment_date ? s.enrollment_date.substring(0, 7) : '2026-02';
      const endYearMonth = s.period_end_date ? s.period_end_date.substring(0, 7) : `${currentYearStr}-12`;

      MONTHS.forEach((m, idx) => {
        const targetYearMonth = `${currentYearStr}-${String(idx + 1).padStart(2, '0')}`;
        
        // Verificar si está dentro del rango
        const inRange = targetYearMonth >= startYearMonth && targetYearMonth <= endYearMonth;
        
        if (inRange) {
          const st = studentStatus[m];
          let displayStatus = st || 'UNPAID';
          
          if (displayStatus === 'UNPAID' && s.status !== 'SUSPENDIDO') {
            if (currentMonth > idx || (currentMonth === idx && currentDay > 10)) {
              displayStatus = 'MOROSO';
            }
          }

          if (displayStatus === 'PAID') {
            monthsPaid++;
          } else if (displayStatus === 'MOROSO') {
            monthsUnpaid++;
          } else if (displayStatus === 'PARTIAL') {
            monthsPartial++;
          }
        }
      });

      return {
        ...s,
        months_paid: monthsPaid,
        months_unpaid: monthsUnpaid,
        months_partial: monthsPartial,
      };
    });
  }, [students, statusMap]);

  const availableRubros = useMemo(() => {
    const set = new Set<string>(['FICHAJE', 'INDUMENTARIA', 'CARNET', 'MICRO']);
    Object.values(extraChargesByStudent).forEach(charges => {
      charges.forEach(ec => {
        if (ec.rubro) set.add(ec.rubro);
      });
    });
    return Array.from(set).sort();
  }, [extraChargesByStudent]);

  const filtered = useMemo(() => {
    let result = computedStudents;
    if (search) {
      const term = search.toUpperCase();
      result = result.filter(s => {
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
      result = result.filter(s => s.category === categoryFilter);
    }
    if (statusFilter !== 'ALL') {
      result = result.filter(s => s.status === statusFilter);
    }
    if (rubroFilter !== 'ALL') {
      result = result.filter(s => {
        const charges = extraChargesByStudent[s.id] || [];
        return charges.some(ec => ec.rubro === rubroFilter);
      });
    }
    return result;
  }, [computedStudents, search, categoryFilter, statusFilter, rubroFilter, extraChargesByStudent]);

  const handleExportExcel = () => {
    const data = filtered.map(s => ({
      ID: s.id,
      Nombre: s.name,
      Categoría: s.category,
      Grupo: s.group_name,
      Estado: s.status,
      Teléfono: s.phone,
      CuotaMensual: s.monthly_quota,
      PagosRegistrados: s.payment_count || 0,
      TotalAbonado: s.total_paid || 0,
      SaldoPendiente: s.total_balance || 0,
      MesesPagos: s.months_paid || 0,
      MesesImpagos: s.months_unpaid || 0,
      Notas: s.notes
    }));
    exportToExcel(data, `Alumnos_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    const columns = [
      { header: 'ID', dataKey: 'id' },
      { header: 'Nombre', dataKey: 'name' },
      { header: 'Categoría', dataKey: 'category' },
      { header: 'Estado', dataKey: 'status' },
      { header: 'Pagos', dataKey: 'payment_count' },
      { header: 'Monto Total', dataKey: 'total_paid' },
      { header: 'Meses Impagos', dataKey: 'months_unpaid' }
    ];
    exportToPDF(filtered, `Alumnos_${new Date().toISOString().split('T')[0]}`, 'Reporte de Alumnos', columns);
  };

  const selected = selectedStudent ? computedStudents.find(s => s.id === selectedStudent) : null;
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
          placeholder="🔍 Buscar por nombre, concepto, indumentaria, fichaje..."
          className="search-input"
          style={{ flex: 1, minWidth: '220px' }}
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
        <select
          className="filter-select"
          value={rubroFilter}
          onChange={e => setRubroFilter(e.target.value)}
          style={{ marginLeft: '0.5rem' }}
        >
          <option value="ALL">Todos los conceptos / rubros</option>
          {availableRubros.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ marginLeft: '0.5rem' }}
        >
          <option value="ACTIVE">Activos</option>
          <option value="SUSPENDIDO">Suspendidos</option>
          <option value="ALL">Todos los Estados</option>
        </select>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <button onClick={handleExportExcel} className="btn" style={{ background: '#217346', color: 'white', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            📊 Excel
          </button>
          <button onClick={handleExportPDF} className="btn" style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            📄 PDF
          </button>
        </div>
        <span className="filter-count" style={{ marginLeft: '1rem' }}>
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

      <EditStudentModal
        isOpen={isEditStudentModalOpen}
        onClose={() => setIsEditStudentModalOpen(false)}
        student={selected || null}
      />

      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        student={selected ? { id: selected.id, name: selected.name, category: selected.category, monthly_quota: selected.monthly_quota } : null}
        payments={selected ? paymentsByStudent[selected.id] || [] : []}
      />

      <EditPaymentModal
        isOpen={isEditPaymentModalOpen}
        onClose={() => setIsEditPaymentModalOpen(false)}
        payment={editingPayment}
        studentName={selected?.name}
      />

      {disabledModal.isOpen && (
        <div className="modal-overlay" onClick={() => setDisabledModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content glass animate-in" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title title-gradient">Mes Deshabilitado</h3>
              <button className="modal-close" onClick={() => setDisabledModal(prev => ({ ...prev, isOpen: false }))}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '1.2rem', lineHeight: '1.4' }}>
                Establece el motivo por el cual se deshabilita el mes de <strong>{disabledModal.monthName}</strong> para este alumno. Esto evitará que se calcule como moroso.
              </p>
              <div className="form-group">
                <label className="form-label">Motivo / Detalle</label>
                <textarea
                  className="form-textarea"
                  value={disabledModal.reason}
                  onChange={e => setDisabledModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ej: Empezó tarde / Licencia médica / Suspensión acordada"
                  rows={4}
                  style={{ width: '100%', minHeight: '80px', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                onClick={async () => {
                  if (disabledModal.studentId) {
                    const currentYear = new Date().getFullYear().toString();
                    await toggleMonthPayment(disabledModal.studentId, currentYear, disabledModal.monthName, 'UNPAID', '');
                    setDisabledModal(prev => ({ ...prev, isOpen: false }));
                  }
                }}
              >
                Habilitar Mes (✗)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  if (disabledModal.studentId) {
                    const currentYear = new Date().getFullYear().toString();
                    await toggleMonthPayment(disabledModal.studentId, currentYear, disabledModal.monthName, 'DESHABILITADO', disabledModal.reason);
                    setDisabledModal(prev => ({ ...prev, isOpen: false }));
                  }
                }}
              >
                Guardar Motivo
              </button>
            </div>
          </div>
        </div>
      )}

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
                      {s.status === 'SUSPENDIDO' 
                        ? <span className="badge badge-secondary">Suspendido</span>
                        : s.months_unpaid > 2
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
                <h2 
                  className="student-name title-hover-edit" 
                  onClick={() => setIsEditStudentModalOpen(true)}
                  title="Haga clic para editar todos los datos del alumno"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {selected.name}
                  <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>✏️</span>
                </h2>
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
                    className="btn glass-hover" 
                    style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.4rem 0.8rem', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#fff'
                    }}
                    onClick={() => setIsEditStudentModalOpen(true)}
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    className="btn glass-hover" 
                    style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.4rem 0.8rem', 
                        background: selected.status === 'SUSPENDIDO' ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 170, 0, 0.1)', 
                        borderColor: selected.status === 'SUSPENDIDO' ? 'rgba(0, 210, 255, 0.3)' : 'rgba(255, 170, 0, 0.3)',
                        color: selected.status === 'SUSPENDIDO' ? '#00d2ff' : '#ffaa00'
                    }}
                    onClick={() => handleToggleSuspend(selected)}
                  >
                    {selected.status === 'SUSPENDIDO' ? '▶️ Reactivar' : '⏸️ Suspender'}
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
              <div 
                className="detail-item glass detail-item-clickable" 
                style={{ padding: '0.75rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => setIsEditStudentModalOpen(true)}
                title="Haga clic para editar el período de cobro"
              >
                <span className="detail-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '0.2rem' }}>Período Activo</span>
                <span className="detail-value text-secondary" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                  {selected.enrollment_date ? selected.enrollment_date.substring(0, 7) : '-'} al {selected.period_end_date ? selected.period_end_date.substring(0, 7) : '2026-12'}
                </span>
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
                📅 Cuotas Mensuales
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
                💎 Conceptos Especiales
              </button>
            </div>

            {/* TAB CONTENT: CUOTAS */}
            {activeTab === 'CUOTAS' && (
              <>
                {/* MONTHLY MATRIX (for this student) */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Estado Mensual (Vencimiento: día 10)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3rem' }}>
                    {/* FICHAJE BOX */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 700 }}>
                        FICHAJE
                        </div>
                        <div 
                        className={`matrix-cell ${selectedStatus['FICHAJE'] === 'PAID' ? 'status-paid' : 'status-unpaid'}`} 
                        style={{ width: '100%', height: '28px', cursor: 'pointer', userSelect: 'none', border: '2px solid rgba(255, 255, 255, 0.1)' }}
                        onClick={() => handleToggleMonth(selected.id, 'FICHAJE', selectedStatus['FICHAJE'] || 'UNPAID')}
                        title={`Click para cambiar estado (Actual: ${selectedStatus['FICHAJE'] || 'UNPAID'})`}
                        >
                        {selectedStatus['FICHAJE'] === 'PAID' ? '✓' : '✗'}
                        </div>
                    </div>

                    {MONTHS.map((m, idx) => {
                      const currentMonth = new Date().getMonth();
                      const currentDay = new Date().getDate();
                      const currentYearStr = new Date().getFullYear().toString();
                      const targetYearMonth = `${currentYearStr}-${String(idx + 1).padStart(2, '0')}`;
                      
                      const startYearMonth = selected.enrollment_date ? selected.enrollment_date.substring(0, 7) : '2026-02';
                      const endYearMonth = selected.period_end_date ? selected.period_end_date.substring(0, 7) : `${currentYearStr}-12`;
                      
                      const inRange = targetYearMonth >= startYearMonth && targetYearMonth <= endYearMonth;
                      
                      const st = selectedStatus[m];
                      let displayStatus = st || 'UNPAID';
                      let isClickable = true;
                      
                      if (!inRange) {
                        displayStatus = 'EXEMPT';
                        isClickable = false;
                      } else if (displayStatus === 'UNPAID' && selected.status !== 'SUSPENDIDO') {
                         if (currentMonth > idx || (currentMonth === idx && currentDay > 10)) {
                             displayStatus = 'MOROSO';
                         }
                      }

                      const cls = displayStatus === 'EXEMPT' ? 'status-exempt'
                                : displayStatus === 'PAID' ? 'status-paid' 
                                : displayStatus === 'PARTIAL' ? 'status-partial' 
                                : displayStatus === 'DESHABILITADO' ? 'status-disabled'
                                : displayStatus === 'MOROSO' ? 'status-danger'
                                : displayStatus === 'SUSPENDIDO' ? 'status-suspended'
                                : 'status-unpaid';
                                 
                      return (
                        <div key={m} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                            {m.substring(0, 3)}
                          </div>
                          <div 
                            className={`matrix-cell ${cls}`} 
                            style={{ 
                              width: '100%', 
                              height: '28px', 
                              cursor: isClickable ? 'pointer' : 'not-allowed', 
                              userSelect: 'none' 
                            }}
                            onClick={() => isClickable && handleToggleMonth(selected.id, m, displayStatus)}
                            title={isClickable 
                              ? (displayStatus === 'DESHABILITADO' 
                                ? `Mes Deshabilitado: ${(disabledReasonsMap[selected.id] || {})[m] || 'Sin especificar'}` 
                                : `Click para cambiar estado (Actual: ${displayStatus})`)
                              : 'Fuera de período de cobro'}
                          >
                            {displayStatus === 'PAID' ? '✓' 
                             : displayStatus === 'PARTIAL' ? '~' 
                             : displayStatus === 'SUSPENDIDO' ? '⏸' 
                             : displayStatus === 'EXEMPT' ? '-' 
                             : displayStatus === 'DESHABILITADO' ? '🚫'
                             : '✗'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PAYMENT HISTORY GROUPED BY MONTH/INSTALLMENT */}
                {selectedPayments.length > 0 && (() => {
                  const groups: Record<string, {
                    key: string;
                    label: string;
                    rubro: string;
                    monthCovered: string;
                    targetValue: number;
                    totalPaid: number;
                    remainingBalance: number;
                    isComplete: boolean;
                    payments: Payment[];
                  }> = {};

                  selectedPayments.forEach(p => {
                    let key = `single_${p.id}`;
                    let label = p.rubro || 'PAGO';
                    let monthCovered = p.month_covered || '';
                    if (p.receipt && p.receipt.startsWith('CE-')) {
                      key = `ce_${p.receipt}`;
                      label = `${p.rubro} (${p.receipt})`;
                    } else if (p.month_covered) {
                      const ym = p.month_covered.substring(0, 7);
                      key = `month_${ym}_${p.rubro || 'CUOTA'}`;
                      const parts = ym.split('-');
                      const monthIndex = parseInt(parts[1], 10) - 1;
                      const monthName = MONTHS[monthIndex] || parts[1];
                      label = `CUOTA ${monthName} ${parts[0]}`;
                    }

                    if (!groups[key]) {
                      groups[key] = {
                        key,
                        label,
                        rubro: p.rubro,
                        monthCovered,
                        targetValue: p.month_value || p.amount_paid,
                        totalPaid: 0,
                        remainingBalance: 0,
                        isComplete: false,
                        payments: []
                      };
                    }
                    groups[key].payments.push(p);
                    groups[key].totalPaid += p.amount_paid;
                  });

                  const groupList = Object.values(groups).map(g => {
                    g.payments.sort((a, b) => (a.payment_date || '').localeCompare(b.payment_date || ''));
                    const target = g.targetValue > 0 ? g.targetValue : g.totalPaid;
                    g.targetValue = target;
                    g.remainingBalance = Math.max(0, target - g.totalPaid);
                    g.isComplete = g.remainingBalance === 0;
                    return g;
                  });

                  groupList.sort((a, b) => {
                    const dateA = a.payments[a.payments.length - 1]?.payment_date || a.monthCovered || '';
                    const dateB = b.payments[b.payments.length - 1]?.payment_date || b.monthCovered || '';
                    return dateB.localeCompare(dateA);
                  });

                  return (
                    <div>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Historial de Pagos y Movimientos ({selectedPayments.length} abonos en {groupList.length} cuotas)
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto' }}>
                        {groupList.map(group => (
                          <div 
                            key={group.key}
                            className="glass"
                            style={{
                              padding: '0.75rem',
                              border: '1px solid var(--card-border)',
                              borderRadius: 'var(--radius-sm)',
                              background: group.isComplete ? 'rgba(0, 255, 136, 0.02)' : 'rgba(245, 158, 11, 0.02)'
                            }}
                          >
                            {/* Group Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff' }}>📅 {group.label}</span>
                                {group.payments.length > 1 && (
                                  <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                                    {group.payments.length} pagos
                                  </span>
                                )}
                                {group.isComplete ? (
                                  <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>✓ Completada</span>
                                ) : (
                                  <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>⏳ Restan ${group.remainingBalance.toLocaleString()}</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                Total: <strong>${group.totalPaid.toLocaleString()}</strong> de ${group.targetValue.toLocaleString()}
                              </div>
                            </div>

                            {/* Movements List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              {group.payments.map((p, pIdx) => (
                                <div 
                                  key={p.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.4rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '3px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {group.payments.length > 1 && (
                                      <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', fontWeight: 600 }}>#{pIdx + 1}</span>
                                    )}
                                    <span>📅 {p.payment_date}</span>
                                    <span style={{ 
                                      fontSize: '0.65rem', 
                                      padding: '0.05rem 0.3rem', 
                                      borderRadius: '3px',
                                      background: p.method === 'EFECTIVO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                                      color: p.method === 'EFECTIVO' ? 'var(--success)' : '#60a5fa'
                                    }}>
                                      {p.method === 'EFECTIVO' ? '💵 EFECTIVO' : '💳 ' + p.method}
                                    </span>
                                    {p.info && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>· {p.info}</span>}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <strong style={{ color: 'var(--success)' }}>+${(p.amount_paid || 0).toLocaleString()}</strong>
                                    <button type="button" onClick={() => handleEditPayment(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }} title="Editar pago">✏️</button>
                                    <button type="button" onClick={() => handleDeletePayment(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', opacity: 0.7 }} title="Eliminar pago">🗑️</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* TAB CONTENT: ESPECIALES */}
            {activeTab === 'ESPECIALES' && (
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* FORM TO ADD EXTRA CHARGE */}
                <form onSubmit={handleAddExtraCharge} className="glass" style={{ padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ➕ Asignar Cargo Especial
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
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Estado</label>
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

                {/* LIST OF CURRENT EXTRA CHARGES FOR THIS STUDENT */}
                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cargos Especiales Asignados ({(extraChargesByStudent[selected.id] || []).length})
                  </h4>
                  {(!extraChargesByStudent[selected.id] || extraChargesByStudent[selected.id].length === 0) ? (
                    <div className="glass" style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No tiene cargos especiales asignados.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                      {extraChargesByStudent[selected.id].map(charge => {
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }}>{charge.rubro}</span>
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{charge.item_name}</span>
                                  {isFullyPaid ? (
                                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>✅ Pagado</span>
                                  ) : isPartial ? (
                                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>⏳ Parcial</span>
                                  ) : (
                                    <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>✗ Impago</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span>Vencimiento: {charge.due_date}</span>
                                  {charge.notes && <span>· {charge.notes}</span>}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {!isFullyPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenChargePaymentModal(charge)}
                                    className="btn btn-primary glass-hover"
                                    style={{
                                      padding: '0.25rem 0.6rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      boxShadow: '0 0 10px var(--primary-glow)'
                                    }}
                                  >
                                    ➕ Abonar (${remaining.toLocaleString()})
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleClick(charge.id, 'PAID')}
                                    className="btn"
                                    style={{
                                      padding: '0.2rem 0.5rem',
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
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6 }}
                                  title="Eliminar cargo"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            {/* Financial breakdown */}
                            <div style={{ 
                              marginTop: '0.5rem', 
                              padding: '0.4rem 0.6rem', 
                              background: 'rgba(0,0,0,0.25)', 
                              borderRadius: 'var(--radius-sm)',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '0.4rem',
                              fontSize: '0.75rem'
                            }}>
                              <div>
                                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.65rem' }}>Total:</span>
                                <span style={{ fontWeight: 700 }}>${amount.toLocaleString()}</span>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.65rem' }}>Abonado:</span>
                                <span style={{ fontWeight: 700, color: totalPaid > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                  ${totalPaid.toLocaleString()} {movements.length > 0 ? `(${movements.length} pago${movements.length > 1 ? 's' : ''})` : ''}
                                </span>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.65rem' }}>Saldo Restante:</span>
                                <span style={{ fontWeight: 800, color: remaining > 0 ? '#f59e0b' : 'var(--success)' }}>
                                  ${remaining.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Payment movements */}
                            {movements.length > 0 && (
                              <div style={{ marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
                                  📋 Movimientos ({movements.length}):
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  {movements.map((m, idx) => (
                                    <div key={m.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', padding: '0.15rem 0.35rem', background: 'rgba(255,255,255,0.02)', borderRadius: '3px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span>📅 {m.payment_date}</span>
                                        <span style={{ fontSize: '0.62rem', color: m.method === 'EFECTIVO' ? 'var(--success)' : '#60a5fa' }}>({m.method})</span>
                                      </div>
                                      <span style={{ fontWeight: 700, color: 'var(--success)' }}>+${m.amount_paid.toLocaleString()}</span>
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

            {/* NOTES */}
            {selected.notes && (
              <div 
                onClick={() => setIsEditStudentModalOpen(true)}
                title="Haga clic para editar las notas del alumno"
                style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: 'rgba(0, 210, 255, 0.05)', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid rgba(0, 210, 255, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  animation: 'fadeIn 0.5s ease-out'
                }}
                className="notes-clickable-edit"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ℹ️ Notas y Observaciones
                  </div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>✏️</span>
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
          .title-hover-edit:hover {
              color: var(--primary) !important;
          }
          .detail-item-clickable:hover {
              border-color: rgba(0, 255, 136, 0.3) !important;
              background: rgba(0, 255, 136, 0.03) !important;
              transform: translateY(-2px);
          }
          .notes-clickable-edit:hover {
              border-color: rgba(0, 210, 255, 0.4) !important;
              background: rgba(0, 210, 255, 0.08) !important;
          }
      `}</style>

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
                onChange={e => setSelectedMethod(e.target.value as any)}
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
      {/* CHARGE INSTALLMENT PAYMENT MODAL */}
      {chargePaymentModal.isOpen && chargePaymentModal.charge && (
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
                onClick={() => setChargePaymentModal(prev => ({ ...prev, isOpen: false, charge: null }))}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--primary)' }}>{selected?.name}</p>
              <p style={{ margin: '0.2rem 0 0 0', color: '#fff' }}>{chargePaymentModal.charge.item_name} ({chargePaymentModal.charge.rubro})</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                <span>Total Concepto: ${(chargePaymentModal.charge.amount || 0).toLocaleString()}</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                  Resta: ${(chargePaymentModal.charge.remaining_balance !== undefined ? chargePaymentModal.charge.remaining_balance : chargePaymentModal.charge.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmChargePayment}>
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
                  value={chargePaymentModal.amountToPay}
                  onChange={e => setChargePaymentModal(prev => ({ ...prev, amountToPay: e.target.value }))}
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
                    value={chargePaymentModal.method}
                    onChange={e => setChargePaymentModal(prev => ({ ...prev, method: e.target.value }))}
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
                    value={chargePaymentModal.paymentDate}
                    onChange={e => setChargePaymentModal(prev => ({ ...prev, paymentDate: e.target.value }))}
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
                  value={chargePaymentModal.notes}
                  onChange={e => setChargePaymentModal(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, height: '40px' }}
                  onClick={() => setChargePaymentModal(prev => ({ ...prev, isOpen: false, charge: null }))}
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
    </div>
  );
}
