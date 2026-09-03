'use client';

import React, { useState, useMemo } from 'react';
import { AttendanceRecordItem, AttendanceTeacherItem, AttendanceStudentItem } from '@/lib/attendanceDb';
import { exportToExcel, exportToPDF } from '@/lib/export';

interface AsistenciasUIProps {
  initialRecords: AttendanceRecordItem[];
  teachers: AttendanceTeacherItem[];
  students: AttendanceStudentItem[];
}

export default function AsistenciasUI({
  initialRecords,
  teachers,
  students,
}: AsistenciasUIProps) {
  const [activeTab, setActiveTab] = useState<'historial' | 'alumnos' | 'profesores'>('historial');
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [turnoFilter, setTurnoFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customDate, setCustomDate] = useState('');
  const [studentSort, setStudentSort] = useState<'name' | 'most_absent' | 'lowest_rate' | 'highest_rate'>('most_absent');

  // Distinct filter options
  const categories = useMemo(() => {
    const set = new Set<number>();
    initialRecords.forEach((r) => set.add(r.category));
    students.forEach((s) => set.add(s.category));
    return Array.from(set).sort((a, b) => a - b);
  }, [initialRecords, students]);

  const turnos = useMemo(() => {
    const set = new Set<string>();
    initialRecords.forEach((r) => {
      if (r.turno) set.add(r.turno);
    });
    students.forEach((s) => {
      if (s.turno) set.add(s.turno);
    });
    return Array.from(set).sort();
  }, [initialRecords, students]);

  // General KPIs across all records
  const globalStats = useMemo(() => {
    const total = initialRecords.length;
    const present = initialRecords.filter((r) => r.status === 'PRESENT').length;
    const late = initialRecords.filter((r) => r.status === 'LATE').length;
    const absent = initialRecords.filter((r) => r.status === 'ABSENT').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    
    // Unique dates
    const uniqueDates = new Set(initialRecords.map((r) => r.date.split('T')[0])).size;

    return {
      total,
      present,
      late,
      absent,
      rate,
      uniqueDates,
      studentsCount: students.length,
    };
  }, [initialRecords, students]);

  // Filtered attendance history
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return initialRecords.filter((r) => {
      const recordDate = r.date.split('T')[0];

      // Text search (student or teacher)
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchStudent = r.student_name.toLowerCase().includes(term);
        const matchTeacher = r.teacher_name.toLowerCase().includes(term);
        if (!matchStudent && !matchTeacher) return false;
      }

      // Teacher filter
      if (teacherFilter !== 'ALL' && r.teacher_name !== teacherFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && String(r.category) !== categoryFilter) {
        return false;
      }

      // Turno filter
      if (turnoFilter !== 'ALL' && r.turno !== turnoFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false;
      }

      // Date presets
      if (dateFilter === 'TODAY' && recordDate !== todayStr) {
        return false;
      }
      if (dateFilter === 'CUSTOM' && customDate && recordDate !== customDate) {
        return false;
      }

      return true;
    });
  }, [initialRecords, search, teacherFilter, categoryFilter, turnoFilter, statusFilter, dateFilter, customDate]);

  // Aggregated stats per student
  const studentSummaries = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      category: number;
      turno: string;
      teacher_name: string;
      total: number;
      present: number;
      late: number;
      absent: number;
      rate: number;
    }>();

    // Initialize map with all students
    students.forEach((s) => {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        category: s.category,
        turno: s.turno,
        teacher_name: s.teacher_name,
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        rate: 0,
      });
    });

    // Populate with attendance records
    initialRecords.forEach((r) => {
      let entry = map.get(r.student_id);
      if (!entry) {
        entry = {
          id: r.student_id,
          name: r.student_name,
          category: r.category,
          turno: r.turno,
          teacher_name: r.teacher_name,
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          rate: 0,
        };
        map.set(r.student_id, entry);
      }

      entry.total += 1;
      if (r.status === 'PRESENT') entry.present += 1;
      else if (r.status === 'LATE') entry.late += 1;
      else if (r.status === 'ABSENT') entry.absent += 1;
    });

    // Calculate rates
    const list = Array.from(map.values()).map((entry) => {
      const rate = entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0;
      return { ...entry, rate };
    });

    // Apply search filter
    let filtered = list;
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(term) ||
        s.teacher_name.toLowerCase().includes(term) ||
        String(s.category).includes(term)
      );
    }

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((s) => String(s.category) === categoryFilter);
    }
    if (teacherFilter !== 'ALL') {
      filtered = filtered.filter((s) => s.teacher_name === teacherFilter);
    }
    if (turnoFilter !== 'ALL') {
      filtered = filtered.filter((s) => s.turno === turnoFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (studentSort === 'name') return a.name.localeCompare(b.name);
      if (studentSort === 'most_absent') return b.absent - a.absent || a.name.localeCompare(b.name);
      if (studentSort === 'lowest_rate') return a.rate - b.rate || b.absent - a.absent;
      if (studentSort === 'highest_rate') return b.rate - a.rate || a.name.localeCompare(b.name);
      return 0;
    });

    return filtered;
  }, [students, initialRecords, search, categoryFilter, teacherFilter, turnoFilter, studentSort]);

  // Aggregated metrics per teacher
  const teacherMetrics = useMemo(() => {
    return teachers.map((t) => {
      const teacherStudents = students.filter((s) => s.teacher_name.toLowerCase() === t.name.toLowerCase());
      const teacherRecords = initialRecords.filter((r) => r.teacher_name.toLowerCase() === t.name.toLowerCase());
      const presentCount = teacherRecords.filter((r) => r.status === 'PRESENT').length;
      const absentCount = teacherRecords.filter((r) => r.status === 'ABSENT').length;
      const lateCount = teacherRecords.filter((r) => r.status === 'LATE').length;
      const totalRecords = teacherRecords.length;
      const rate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

      // Group by categories and turnos
      const groupsMap = new Map<string, number>();
      teacherStudents.forEach((s) => {
        const key = `Cat. ${s.category} — ${s.turno}`;
        groupsMap.set(key, (groupsMap.get(key) || 0) + 1);
      });

      return {
        ...t,
        studentCount: teacherStudents.length,
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        rate,
        groups: Array.from(groupsMap.entries()).map(([label, count]) => ({ label, count })),
      };
    });
  }, [teachers, students, initialRecords]);

  // Format date helper
  const formatDateLabel = (iso: string) => {
    const datePart = iso.split('T')[0];
    const [y, m, d] = datePart.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const weekday = dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${d}/${m}/${y}`;
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (activeTab === 'historial') {
      const exportData = filteredRecords.map((r) => ({
        Fecha: r.date.split('T')[0],
        Alumno: r.student_name,
        Categoría: r.category,
        Turno: r.turno,
        Profesor: r.teacher_name,
        Estado: r.status === 'PRESENT' ? 'Presente' : r.status === 'LATE' ? 'Tarde' : 'Ausente',
      }));
      exportToExcel(exportData, `Asistencias_AKDs_${new Date().toISOString().split('T')[0]}`, 'Asistencias');
    } else if (activeTab === 'alumnos') {
      const exportData = studentSummaries.map((s) => ({
        Alumno: s.name,
        Categoría: s.category,
        Turno: s.turno,
        Profesor: s.teacher_name,
        'Clases Registradas': s.total,
        Presentes: s.present,
        Tardes: s.late,
        'Faltas (Ausente)': s.absent,
        '% Asistencia': `${s.rate}%`,
      }));
      exportToExcel(exportData, `Resumen_Alumnos_Asistencias_${new Date().toISOString().split('T')[0]}`, 'Alumnos');
    } else {
      const exportData = teacherMetrics.map((t) => ({
        Profesor: t.name,
        'Alumnos Asignados': t.studentCount,
        'Asistencias Registradas': t.totalRecords,
        Presentes: t.presentCount,
        Tardes: t.lateCount,
        Ausentes: t.absentCount,
        '% Presentismo': `${t.rate}%`,
      }));
      exportToExcel(exportData, `Resumen_Profesores_${new Date().toISOString().split('T')[0]}`, 'Profesores');
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (activeTab === 'historial') {
      const exportData = filteredRecords.map((r) => ({
        fecha: r.date.split('T')[0],
        alumno: r.student_name,
        categoria: String(r.category),
        turno: r.turno,
        profesor: r.teacher_name,
        estado: r.status === 'PRESENT' ? 'Presente' : r.status === 'LATE' ? 'Tarde' : 'Ausente',
      }));
      exportToPDF(
        exportData,
        `Asistencias_AKDs_${new Date().toISOString().split('T')[0]}`,
        'AKDs — Historial de Asistencias',
        [
          { header: 'Fecha', dataKey: 'fecha' },
          { header: 'Alumno', dataKey: 'alumno' },
          { header: 'Cat.', dataKey: 'categoria' },
          { header: 'Turno', dataKey: 'turno' },
          { header: 'Profesor', dataKey: 'profesor' },
          { header: 'Estado', dataKey: 'estado' },
        ]
      );
    } else {
      const exportData = studentSummaries.map((s) => ({
        alumno: s.name,
        categoria: String(s.category),
        turno: s.turno,
        profesor: s.teacher_name,
        total: String(s.total),
        present: String(s.present),
        absent: String(s.absent),
        rate: `${s.rate}%`,
      }));
      exportToPDF(
        exportData,
        `Resumen_Alumnos_${new Date().toISOString().split('T')[0]}`,
        'AKDs — Resumen de Asistencia por Alumno',
        [
          { header: 'Alumno', dataKey: 'alumno' },
          { header: 'Cat.', dataKey: 'categoria' },
          { header: 'Turno', dataKey: 'turno' },
          { header: 'Profesor', dataKey: 'profesor' },
          { header: 'Clases', dataKey: 'total' },
          { header: 'Presentes', dataKey: 'present' },
          { header: 'Faltas', dataKey: 'absent' },
          { header: '% Asistencia', dataKey: 'rate' },
        ]
      );
    }
  };

  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">📅 Control de Asistencias</h1>
          <p className="page-subtitle">
            Trazabilidad en tiempo real de asistencias, presentismo y faltas sincronizadas con los profesores de la academia.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            📊 Exportar Excel
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Registros</span>
          <span className="stat-value">{globalStats.total}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            en {globalStats.uniqueDates} jornadas tomadas
          </span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <span className="stat-label" style={{ color: 'var(--success)' }}>Tasa Presentismo</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>
            {globalStats.rate}%
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {globalStats.present} presentes
          </span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <span className="stat-label" style={{ color: 'var(--warning)' }}>Tardanzas</span>
          <span className="stat-value" style={{ color: 'var(--warning)' }}>
            {globalStats.late}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            llegadas tarde
          </span>
        </div>
        <div className="stat-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <span className="stat-label" style={{ color: 'var(--danger)' }}>Faltas Totales</span>
          <span className="stat-value" style={{ color: 'var(--danger)' }}>
            {globalStats.absent}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            ausencias computadas
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Alumnos Roster</span>
          <span className="stat-value">{globalStats.studentsCount}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            distribuidos en {teachers.length} profesores
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('historial')}
          className={`btn ${activeTab === 'historial' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          📋 Historial de Registros ({filteredRecords.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alumnos')}
          className={`btn ${activeTab === 'alumnos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          👥 Resumen por Alumno ({studentSummaries.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profesores')}
          className={`btn ${activeTab === 'profesores' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
        >
          👨‍🏫 Por Profesor ({teacherMetrics.length})
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ gridColumn: 'span 2' }}>
            <input
              type="text"
              placeholder="Buscar por alumno o profesor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              style={{ width: '100%' }}
            />
          </div>

          {/* Teacher Filter */}
          <div>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="ALL">👨‍🏫 Todos los Profesores</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.name}>
                  Prof. {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="ALL">🏆 Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c} value={String(c)}>
                  Cat. {c}
                </option>
              ))}
            </select>
          </div>

          {/* Turno Filter */}
          <div>
            <select
              value={turnoFilter}
              onChange={(e) => setTurnoFilter(e.target.value)}
              className="filter-select"
              style={{ width: '100%' }}
            >
              <option value="ALL">⏰ Todos los Turnos</option>
              {turnos.map((tn) => (
                <option key={tn} value={tn}>
                  {tn}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (Active in historial) */}
          {activeTab === 'historial' && (
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
                style={{ width: '100%' }}
              >
                <option value="ALL">🏷️ Todos los Estados</option>
                <option value="PRESENT">🟢 Presentes</option>
                <option value="LATE">🟡 Tardes</option>
                <option value="ABSENT">🔴 Ausentes (Faltas)</option>
              </select>
            </div>
          )}

          {/* Date Filter (Active in historial) */}
          {activeTab === 'historial' && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="filter-select"
                style={{ flex: 1 }}
              >
                <option value="ALL">📅 Todas las Fechas</option>
                <option value="TODAY">Hoy</option>
                <option value="CUSTOM">Elegir Fecha...</option>
              </select>
              {dateFilter === 'CUSTOM' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="filter-select"
                  style={{ width: '130px' }}
                />
              )}
            </div>
          )}

          {/* Sort Filter (Active in alumnos) */}
          {activeTab === 'alumnos' && (
            <div>
              <select
                value={studentSort}
                onChange={(e) => setStudentSort(e.target.value as any)}
                className="filter-select"
                style={{ width: '100%' }}
              >
                <option value="most_absent">⚠️ Más Faltas Primero</option>
                <option value="lowest_rate">📉 Menor Asistencia %</option>
                <option value="highest_rate">📈 Mayor Asistencia %</option>
                <option value="name">🔤 Nombre Alumno (A-Z)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB CONTENT 1: HISTORIAL DE REGISTROS */}
      {activeTab === 'historial' && (
        <div className="card table-container">
          {filteredRecords.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🔍 No se encontraron asistencias</p>
              <p style={{ fontSize: '0.85rem' }}>Prueba modificando los filtros de búsqueda o fecha.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Fecha</th>
                  <th>Alumno</th>
                  <th style={{ width: '100px' }}>Categoría</th>
                  <th style={{ width: '140px' }}>Turno</th>
                  <th style={{ width: '140px' }}>Profesor</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {formatDateLabel(rec.date)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{rec.student_name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-secondary">Cat. {rec.category}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{rec.turno}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--secondary)' }}>Prof. {rec.teacher_name}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {rec.status === 'PRESENT' && (
                        <span className="badge badge-success">✓ Presente</span>
                      )}
                      {rec.status === 'LATE' && (
                        <span className="badge badge-warning">⏱ Tarde</span>
                      )}
                      {rec.status === 'ABSENT' && (
                        <span className="badge badge-danger">✗ Ausente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: RESUMEN POR ALUMNO */}
      {activeTab === 'alumnos' && (
        <div className="card table-container">
          {studentSummaries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No hay alumnos que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th style={{ width: '110px' }}>Categoría</th>
                  <th style={{ width: '130px' }}>Turno</th>
                  <th style={{ width: '130px' }}>Profesor</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Clases</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Presentes</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Tardes</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Faltas</th>
                  <th style={{ width: '160px' }}>% Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {studentSummaries.map((s) => {
                  const rateColor =
                    s.rate >= 75 ? 'var(--success)' : s.rate >= 50 ? 'var(--warning)' : 'var(--danger)';

                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{s.name}</strong>
                          {s.absent >= 3 && (
                            <span className="badge badge-danger" title="Alumno con 3 o más faltas registradas">
                              ⚠️ {s.absent} Faltas
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">Cat. {s.category}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{s.turno}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--secondary)' }}>Prof. {s.teacher_name}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.total}</td>
                      <td style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                        {s.present}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--warning)' }}>{s.late}</td>
                      <td style={{ textAlign: 'center', color: s.absent > 0 ? 'var(--danger)' : 'var(--text-dim)', fontWeight: 700 }}>
                        {s.absent}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '99px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${s.rate}%`,
                                height: '100%',
                                background: rateColor,
                                borderRadius: '99px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: rateColor, minWidth: '35px' }}>
                            {s.rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: POR PROFESOR Y TURNO */}
      {activeTab === 'profesores' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {teacherMetrics.map((t) => (
            <div key={t.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#fff', margin: 0 }}>Prof. {t.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Usuario: @{t.username}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.3rem 0.7rem',
                      background: t.rate >= 75 ? 'var(--success-soft)' : 'var(--warning-soft)',
                      color: t.rate >= 75 ? 'var(--success)' : 'var(--warning)',
                      border: `1px solid ${t.rate >= 75 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    }}
                  >
                    {t.rate}% Asistencia
                  </span>
                </div>
              </div>

              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Alumnos</span>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{t.studentCount}</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Clases</span>
                  <strong style={{ fontSize: '1.1rem', color: '#fff' }}>{t.totalRecords}</strong>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'block' }}>Presentes</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>{t.presentCount}</strong>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--danger)', display: 'block' }}>Faltas</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--danger)' }}>{t.absentCount}</strong>
                </div>
              </div>

              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Grupos y Turnos Asignados
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {t.groups.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin grupos asignados actualmente</span>
                ) : (
                  t.groups.map((g, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      <span style={{ color: 'var(--text-main)' }}>{g.label}</span>
                      <span className="badge badge-primary">{g.count} alumnos</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
