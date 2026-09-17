'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

interface Student {
  id: number;
  name: string;
  category: string;
  birth_date?: string;
  status?: string;
}

interface BirthdayCalendarProps {
  students: Student[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

export default function BirthdayCalendar({ students }: BirthdayCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(v => v - 1);
    } else {
      setViewMonth(v => v - 1);
    }
  };

  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(v => v + 1);
    } else {
      setViewMonth(v => v + 1);
    }
  };

  const resetToday = () => {
    setSelectedDay(null);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Extract all birthdays for the selected month
  const monthBirthdays = useMemo(() => {
    const list: { student: Student; day: number; year?: number; age?: number }[] = [];

    students.forEach(s => {
      if (!s.birth_date) return;
      const parts = s.birth_date.split('-');
      if (parts.length < 3) return;

      const bYear = parseInt(parts[0], 10);
      const bMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      const bDay = parseInt(parts[2], 10);

      if (bMonth === viewMonth) {
        const age = viewYear - bYear;
        list.push({
          student: s,
          day: bDay,
          year: bYear,
          age: age > 0 ? age : undefined
        });
      }
    });

    return list.sort((a, b) => a.day - b.day);
  }, [students, viewMonth, viewYear]);

  // Group birthdays by day (1..31)
  const birthdaysByDay = useMemo(() => {
    const map: Record<number, Student[]> = {};
    monthBirthdays.forEach(item => {
      if (!map[item.day]) map[item.day] = [];
      map[item.day].push(item.student);
    });
    return map;
  }, [monthBirthdays]);

  // Days in current viewed month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
  // Convert to Monday-first (0 = Mon, 6 = Sun)
  const firstDayOffset = (firstDayRaw + 6) % 7;

  // Filtered list if a specific day is selected
  const displayedBirthdays = useMemo(() => {
    if (selectedDay === null) return monthBirthdays;
    return monthBirthdays.filter(item => item.day === selectedDay);
  }, [monthBirthdays, selectedDay]);

  return (
    <div 
      className="glass" 
      style={{ 
        padding: '1.25rem 1.5rem', 
        marginTop: '1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--card-border)',
        background: 'rgba(15, 23, 42, 0.65)'
      }}
    >
      {/* HEADER WITH MONTH NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
          🎂 <span>Cumpleaños del Mes</span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {!isCurrentMonth && (
            <button
              onClick={resetToday}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
              title="Ir al mes actual"
            >
              Hoy
            </button>
          )}
          <button
            onClick={prevMonth}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
          >
            ◀
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', minWidth: '110px', textAlign: 'center', color: 'var(--primary)' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
          >
            ▶
          </button>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0.5rem 0.8rem', 
          background: monthBirthdays.length > 0 ? 'rgba(236, 72, 153, 0.12)' : 'rgba(255, 255, 255, 0.03)', 
          border: `1px solid ${monthBirthdays.length > 0 ? 'rgba(236, 72, 153, 0.3)' : 'var(--card-border)'}`, 
          borderRadius: 'var(--radius-sm)', 
          marginBottom: '1rem' 
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: monthBirthdays.length > 0 ? '#f472b6' : 'var(--text-muted)' }}>
          {monthBirthdays.length > 0 
            ? `🎉 ${monthBirthdays.length} alumno${monthBirthdays.length > 1 ? 's cumplen' : ' cumple'} en ${MONTH_NAMES[viewMonth]}`
            : `Sin cumpleaños en ${MONTH_NAMES[viewMonth]}`
          }
        </span>
        {selectedDay !== null && (
          <button
            onClick={() => setSelectedDay(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Ver todos ({monthBirthdays.length})
          </button>
        )}
      </div>

      {/* MINI CALENDAR GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        {/* Day headers */}
        {DAY_NAMES.map(d => (
          <div key={d} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', padding: '0.2rem 0' }}>
            {d}
          </div>
        ))}

        {/* Empty slots before day 1 */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: '32px' }} />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const bdayStudents = birthdaysByDay[dayNum] || [];
          const hasBday = bdayStudents.length > 0;

          const isToday = isCurrentMonth && dayNum === now.getDate();
          const isSelected = selectedDay === dayNum;

          return (
            <button
              key={`day-${dayNum}`}
              onClick={() => {
                if (hasBday) {
                  setSelectedDay(selectedDay === dayNum ? null : dayNum);
                }
              }}
              disabled={!hasBday}
              style={{
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                border: isSelected 
                  ? '2px solid #f472b6' 
                  : isToday 
                    ? '1.5px solid var(--primary)' 
                    : hasBday 
                      ? '1px solid rgba(245, 158, 11, 0.6)' 
                      : '1px solid rgba(255, 255, 255, 0.04)',
                background: isSelected 
                  ? 'rgba(236, 72, 153, 0.3)' 
                  : hasBday 
                    ? 'rgba(245, 158, 11, 0.2)' 
                    : isToday 
                      ? 'rgba(16, 185, 129, 0.15)' 
                      : 'rgba(255, 255, 255, 0.02)',
                color: hasBday ? '#fbbf24' : isToday ? 'var(--primary)' : 'inherit',
                fontWeight: hasBday || isToday ? 700 : 500,
                fontSize: '0.78rem',
                cursor: hasBday ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
              title={hasBday ? `Cumpleañero(s): ${bdayStudents.map(s => s.name).join(', ')}` : undefined}
            >
              <span>{dayNum}</span>
              {hasBday && (
                <span 
                  style={{ 
                    position: 'absolute', 
                    top: '-3px', 
                    right: '-3px', 
                    fontSize: '0.6rem',
                    background: '#ec4899',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    boxShadow: '0 0 6px rgba(236, 72, 153, 0.8)'
                  }}
                >
                  🎂
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* BIRTHDAYS ROSTER LIST */}
      <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.8rem' }}>
        <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {selectedDay !== null ? `Cumpleañeros del Día ${selectedDay}` : `Listado de Cumpleañeros (${displayedBirthdays.length})`}
        </h4>

        {displayedBirthdays.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}>
            No hay cumpleaños registrados en esta fecha.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {displayedBirthdays.map((item, index) => {
              const isTodayBday = isCurrentMonth && item.day === now.getDate();

              return (
                <div 
                  key={`${item.student.id}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.45rem 0.6rem',
                    background: isTodayBday ? 'rgba(236, 72, 153, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isTodayBday ? 'rgba(236, 72, 153, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.85rem' }}>{isTodayBday ? '🎉' : '🎂'}</span>
                    <Link 
                      href={`/alumnos?id=${item.student.id}`} 
                      style={{ 
                        fontWeight: 600, 
                        color: 'inherit', 
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      className="hover-underline"
                    >
                      {item.student.name}
                    </Link>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <span className="category-badge" style={{ fontSize: '0.65rem' }}>{item.student.category.split(' ')[0]}</span>
                    <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.75rem' }}>
                      {item.day} {MONTH_NAMES[viewMonth].substring(0, 3)}
                    </span>
                    {item.age && (
                      <span className="text-dim" style={{ fontSize: '0.7rem' }}>
                        ({item.age} años)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
