import React from 'react';
import { fetchAttendanceData } from '@/lib/attendanceDb';
import AsistenciasUI from '@/components/AsistenciasUI';

export const dynamic = 'force-dynamic';

export default async function AsistenciasPage() {
  try {
    const { records, teachers, students } = await fetchAttendanceData();

    return (
      <AsistenciasUI
        initialRecords={records}
        teachers={teachers}
        students={students}
      />
    );
  } catch (error: any) {
    console.error('Error fetching attendance data:', error);
    return (
      <div style={{ padding: '2rem' }}>
        <div className="card" style={{ borderColor: 'var(--danger)', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>⚠️ Error al conectar con la base de asistencias</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
            No se pudieron recuperar los datos de asistencia desde la base de datos de Neon de la academia.
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.5)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            color: '#f87171',
            textAlign: 'left',
            overflowX: 'auto',
            fontSize: '0.85rem'
          }}>
            {error?.message || String(error)}
          </pre>
        </div>
      </div>
    );
  }
}
