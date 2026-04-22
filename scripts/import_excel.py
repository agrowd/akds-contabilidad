"""
AKDs 2026 — Excel → SQLite Importer v2.1
Centrado en el alumno como entidad principal.
Mapeo correcto de columnas según el Excel real.
REGLA DE NEGOCIO: Automatización de Matriz y Entrecruzamiento (WhatsApp Audios).
"""
import pandas as pd
import sqlite3
import os
import re
from datetime import datetime, timedelta
from difflib import SequenceMatcher

EXCEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'AKDs 2026 - COBROS (1).xlsx')
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'akds.sqlite')


def similarity(a, b):
    """Fuzzy string similarity ratio."""
    return SequenceMatcher(None, a.upper(), b.upper()).ratio()


def clean_name(n):
    """Clean and normalize student names."""
    if pd.isna(n) or not str(n).strip():
        return None
    n = str(n).strip().upper()
    # Filter out header rows and non-name entries
    blacklist = {'NAN', 'EQUIPO A', 'EQUIPO B', 'EQUIPO D', 'EQUIPO E',
                 'EQUIPO H', 'EQUIPO I', 'EQUIPO J', 'EQUIPO K',
                 'TOTAL', 'NUMERO', 'MASC / FEM', 'FEM B', 'NO ENTRENA'}
    if n in blacklist:
        return None
    return n


def clean_date(d):
    """Convert various date formats to YYYY-MM-DD string."""
    if pd.isna(d):
        return None
    if hasattr(d, 'strftime'):
        return d.strftime('%Y-%m-%d')
    s = str(d).strip()
    if s.upper() in ('NAT', 'NAN', ''):
        return None
    # Try to extract date part
    parts = s.split(' ')
    if re.match(r'\d{4}-\d{2}-\d{2}', parts[0]):
        return parts[0]
    return s


def parse_date(d_str):
    if not d_str: return None
    try:
        return datetime.strptime(d_str, '%Y-%m-%d')
    except:
        return None


def safe_float(val, default=0.0):
    """Safely convert to float."""
    if pd.isna(val):
        return default
    try:
        if isinstance(val, str):
            val = val.replace('.', '').replace(',', '.')
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    """Safely convert to int."""
    if pd.isna(val):
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def safe_str(val, default=''):
    """Safely convert to string."""
    if pd.isna(val):
        return default
    s = str(val).strip()
    return s if s.upper() != 'NAN' else default


def migrate():
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Excel not found at: {EXCEL_PATH}")
        return

    # Non-destructive migration
    if not os.path.exists(DB_PATH):
        print("Initializing new database...")
    else:
        print("Database exists. Merging new data from Excel...")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # =========================================
    # SCHEMA — Student-centric design
    # =========================================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            category TEXT,
            group_name TEXT,
            gender TEXT,
            team TEXT,
            status TEXT DEFAULT 'ACTIVE',
            notes TEXT DEFAULT ''
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monthly_status (
            student_id INTEGER,
            month TEXT,
            status TEXT,
            PRIMARY KEY (student_id, month),
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER,
            payment_date TEXT,
            month_covered TEXT,
            amount_paid REAL DEFAULT 0,
            month_value REAL DEFAULT 0,
            estado TEXT DEFAULT 'PENDIENTE',
            rubro TEXT,
            method TEXT,
            receipt TEXT,
            due_date TEXT,
            balance REAL DEFAULT 0,
            delay_days INTEGER DEFAULT 0,
            info TEXT DEFAULT '',
            FOREIGN KEY (student_id) REFERENCES students(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reconciliations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            payment_count INTEGER DEFAULT 0,
            rubro TEXT,
            cash_total REAL DEFAULT 0,
            transfer_total REAL DEFAULT 0,
            grand_total REAL DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            recipient TEXT,
            amount REAL DEFAULT 0,
            academy TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monthly_summary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rubro TEXT,
            month TEXT,
            total REAL DEFAULT 0
        )
    ''')

    # Indexes
    cursor.execute('CREATE INDEX idx_payments_student ON payments(student_id)')
    cursor.execute('CREATE INDEX idx_payments_date ON payments(payment_date)')

    xl = pd.ExcelFile(EXCEL_PATH)
    MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
              'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

    # 1. IMPORT STUDENTS
    # (Same logic as before, but keeping notes on how we handle monthly_status)
    if 'INFANTIL' in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name='INFANTIL')
        for _, row in df.iterrows():
            name = clean_name(row.get('APELLIDO Y NOMBRE'))
            if not name: continue
            cursor.execute("INSERT OR IGNORE INTO students (name, category, group_name) VALUES (?, ?, ?)", (name, 'INFANTIL', safe_str(row.get('GRUPO'), 'INFANTIL')))
            cursor.execute("SELECT id FROM students WHERE name = ?", (name,))
            sid = cursor.fetchone()[0]
            for m in MONTHS:
                if m in df.columns:
                    val = safe_str(row.get(m), 'NO').upper()
                    status = 'PAID' if 'SI' in val else 'PARTIAL' if 'INCO' in val else 'UNPAID'
                    cursor.execute("INSERT OR IGNORE INTO monthly_status (student_id, month, status) VALUES (?, ?, ?)", (sid, m, status))

    if 'ESCUELA SD-' in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name='ESCUELA SD-')
        for _, row in df.iterrows():
            name = clean_name(row.get('NOMBRE COMPLETO'))
            if not name: continue
            cursor.execute("INSERT OR IGNORE INTO students (name, category, group_name) VALUES (?, ?, ?)", (name, 'ESCUELA SD', safe_str(row.get('GRUPO'), 'SD')))
            cursor.execute("SELECT id FROM students WHERE name = ?", (name,))
            sid = cursor.fetchone()[0]
            for m in MONTHS:
                if m in df.columns:
                    val = safe_str(row.get(m), 'NO').upper()
                    status = 'PAID' if 'SI' in val else 'UNPAID'
                    cursor.execute("INSERT OR IGNORE INTO monthly_status (student_id, month, status) VALUES (?, ?, ?)", (sid, m, status))

    if 'CDD y TPP' in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name='CDD y TPP')
        for _, row in df.iterrows():
            name = clean_name(row.get(' '))
            if not name: continue
            cat = safe_str(row.get('Unnamed: 1'), 'CDD')
            gender = safe_str(row.get('GENERO'), None)
            team = safe_str(row.get('EQUIPO'), None)
            if gender in ('MASC / FEM',) or team in ('ZONA DE JUEGO',): continue
            cursor.execute("INSERT OR IGNORE INTO students (name, category, group_name, gender, team) VALUES (?, ?, ?, ?, ?)", (name, cat, 'CDD-TPP', gender, team))

    # 2. IMPORT COBROS & AUTOMATIC STATUS SYNC
    cursor.execute("SELECT id, name FROM students")
    student_map = {name: sid for sid, name in cursor.fetchall()}

    def find_student_id(p_name):
        if not p_name: return None
        if p_name in student_map: return student_map[p_name]
        best_match, best_ratio = None, 0
        for sname, sid in student_map.items():
            r = similarity(p_name, sname)
            if r > best_ratio: best_match, best_ratio = sid, r
        if best_ratio >= 0.8: return best_match
        return None

    if 'COBROS' in xl.sheet_names:
        df_c = pd.read_excel(xl, sheet_name='COBROS')
        for _, row in df_c.iterrows():
            dest = clean_name(row.get('DESTINATARIO'))
            if not dest: continue
            sid = find_student_id(dest)
            if not sid:
                cursor.execute("INSERT INTO students (name, category, group_name) VALUES (?, ?, ?)", (dest, 'OTROS', 'EXTERNO'))
                sid = cursor.lastrowid
                student_map[dest] = sid

            p_date_str = clean_date(row.get('FECHA'))
            month_cov_date = clean_date(row.get('CUOTA MES'))
            
            # WhatsApp logic: Due date is the 10th of the month covered
            due_date_str = None
            delay_days = 0
            if month_cov_date:
                # E.g., 2026-02-02 -> due date 2026-02-10
                parts = month_cov_date.split('-')
                due_date_str = f"{parts[0]}-{parts[1]}-10"
                
                # Calculate delay
                p_date = parse_date(p_date_str)
                due_date = parse_date(due_date_str)
                if p_date and due_date:
                    delay_days = (p_date - due_date).days

            amount = safe_float(row.get('VALOR'))
            value = safe_float(row.get('VALOR MES'))
            
            cursor.execute('''
                INSERT INTO payments (
                    student_id, payment_date, month_covered, amount_paid, month_value,
                    estado, rubro, method, receipt, due_date, balance, delay_days, info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (sid, p_date_str, month_cov_date, amount, value, 
                  safe_str(row.get('ESTADO'), 'PENDIENTE'), safe_str(row.get('RUBRO')), 
                  safe_str(row.get('FORMA')), safe_str(row.get('COMPROBANTE')), 
                  due_date_str, safe_float(row.get('DEBE')), delay_days, safe_str(row.get('INFORMACION'))))

            # AUTOMATIC MATRIX SYNC: Update monthly_status from this payment
            if month_cov_date:
                # Map 2026-02-02 -> FEBRERO
                try:
                    m_idx = int(month_cov_date.split('-')[1]) - 1
                    month_name = MONTHS[m_idx]
                    status = 'PAID' if amount >= value else 'PARTIAL' if amount > 0 else 'UNPAID'
                    cursor.execute('''
                        INSERT INTO monthly_status (student_id, month, status) VALUES (?, ?, ?)
                        ON CONFLICT(student_id, month) DO UPDATE SET status = ?
                        WHERE excluded.status = 'PAID' OR status != 'PAID'
                    ''', (sid, month_name, status, status))
                except: pass

    # 3. RENDICION & STAFF
    if 'RENDICION' in xl.sheet_names:
        df_r = pd.read_excel(xl, sheet_name='RENDICION')
        for _, row in df_r.iterrows():
            dia = clean_date(row.get('DIA'))
            if dia:
                cursor.execute("INSERT INTO reconciliations (date, payment_count, rubro, cash_total, transfer_total, grand_total) VALUES (?, ?, ?, ?, ?, ?)",
                    (dia, safe_int(row.get('CANTIDAD DEPAGOS')), safe_str(row.get('RUBRO')), safe_float(row.get('$$$ EFECTIVO')), safe_float(row.get('TRANSFERENCIAS')), safe_float(row.get('TOTAL'))))
            fecha_staff = clean_date(row.get('FECHA'))
            if fecha_staff:
                cursor.execute("INSERT INTO staff_payments (date, recipient, amount, academy) VALUES (?, ?, ?, ?)",
                    (fecha_staff, safe_str(row.get('QUIEN RECIBE')), safe_float(row.get('MONTO ')), safe_str(row.get('ACADEMIA'))))

    # 4. MONTHLY SUMMARY (resumen mensual)
    if 'COBROS' in xl.sheet_names:
        df_c = pd.read_excel(xl, sheet_name='COBROS')
        for _, row in df_c[['Mes'] + [m.capitalize() for m in MONTHS]].dropna(subset=['Mes']).iterrows():
            rubro = safe_str(row.get('Mes'))
            if not rubro or 'correspondientes' in rubro.lower() or 'total' in rubro.lower(): continue
            for m in MONTHS:
                val = safe_float(row.get(m.capitalize()))
                if val > 0: cursor.execute("INSERT INTO monthly_summary (rubro, month, total) VALUES (?, ?, ?)", (rubro, m, val))

    conn.commit()
    conn.close()
    print("Migration v2.1 completed with automated matrix sync and due date logic.")

if __name__ == '__main__':
    migrate()
