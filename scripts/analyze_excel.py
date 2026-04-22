import pandas as pd

excel_path = r'c:\Users\Try Hard\Desktop\guido\AKDs 2026 - COBROS (1).xlsx'
xl = pd.ExcelFile(excel_path)

# COBROS - deep analysis
print('========== HOJA COBROS - ANALISIS PROFUNDO ==========')
df = pd.read_excel(xl, sheet_name='COBROS')
print(f'Filas totales: {len(df)}')
print()

# Show first 10 rows of key columns
print('--- Primeras 10 filas (columnas principales) ---')
for i, row in df.head(10).iterrows():
    dest = row.get('DESTINATARIO')
    valor = row.get('VALOR')
    rubro = row.get('RUBRO')
    estado = row.get('ESTADO')
    forma = row.get('FORMA')
    fecha = row.get('FECHA')
    debe = row.get('DEBE')
    cuota_mes = row.get('CUOTA MES')
    valor_mes = row.get('VALOR MES')
    print(f'  Row {i}: DEST={dest}, VALOR={valor}, RUBRO={rubro}, ESTADO={estado}, FORMA={forma}, FECHA={fecha}, DEBE={debe}, CUOTA_MES={cuota_mes}, VALOR_MES={valor_mes}')

print()
print('--- Valores unicos de RUBRO ---')
print(df['RUBRO'].dropna().unique().tolist())

print()
print('--- Valores unicos de ESTADO ---')
print(df['ESTADO'].dropna().unique().tolist())

print()
print('--- Valores unicos de FORMA ---')
print(df['FORMA'].dropna().unique().tolist())

print()
print('--- Resumen financiero ---')
print(f'Total VALOR: {df["VALOR"].sum()}')
print(f'Total VALOR MES: {df["VALOR MES"].sum()}')
print(f'Total DEBE: {df["DEBE"].sum()}')

print()
print('--- Montos por RUBRO ---')
for rubro in df['RUBRO'].dropna().unique():
    subset = df[df['RUBRO'] == rubro]
    print(f'  {rubro}: {len(subset)} pagos, Total={subset["VALOR"].sum()}, Debe={subset["DEBE"].sum()}')

print()
print('--- Seccion derecha de COBROS (resumen mensual) ---')
right_cols = ['Mes', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
df_right = df[right_cols].dropna(subset=['Mes'])
for i, row in df_right.iterrows():
    mes = row['Mes']
    feb = row.get('Febrero', '')
    mar = row.get('Marzo', '')
    abr = row.get('Abril', '')
    print(f'  {mes}: Feb={feb}, Mar={mar}, Abr={abr}')

print()
print('========== HOJA CDD y TPP - ANALISIS PROFUNDO ==========')
df_cdd = pd.read_excel(xl, sheet_name='CDD y TPP')
print(f'Filas totales: {len(df_cdd)}')
print()
print('--- Primeras 20 filas ---')
for i, row in df_cdd.head(20).iterrows():
    nombre = row.get(' ')
    cat = row.get('Unnamed: 1')
    genero = row.get('GENERO')
    equipo = row.get('EQUIPO')
    print(f'  Row {i}: NOMBRE={nombre}, CAT={cat}, GENERO={genero}, EQUIPO={equipo}')

print()
print('--- Valores unicos col " " (nombre) ---')
nombres = df_cdd[' '].dropna().unique()
print(f'  Total nombres: {len(nombres)}')
# Filter out headers
real_names = [n for n in nombres if str(n).upper() not in ['EQUIPO A', 'EQUIPO B', 'NAN', 'TOTAL', 'NUMERO', 'MASC / FEM']]
print(f'  Nombres reales: {len(real_names)}')

print()
print('--- Valores unicos de cat ---')
print(df_cdd['Unnamed: 1'].dropna().unique().tolist())

print()
print('--- Valores unicos de EQUIPO ---')
print(df_cdd['EQUIPO'].dropna().unique().tolist())

print()
print('========== CROSS-REFERENCE: Destinatarios COBROS vs Students ==========')
cobros_names = set(df['DESTINATARIO'].dropna().str.strip().str.upper().unique())
infantil_df = pd.read_excel(xl, sheet_name='INFANTIL')
infantil_names = set(infantil_df['APELLIDO Y NOMBRE'].dropna().str.strip().str.upper().unique())
sd_df = pd.read_excel(xl, sheet_name='ESCUELA SD-')
sd_names = set(sd_df['NOMBRE COMPLETO'].dropna().str.strip().str.upper().unique())
cdd_names = set(str(n).strip().upper() for n in real_names)

all_student_names = infantil_names | sd_names | cdd_names
print(f'Total alumnos en hojas de categorias: {len(all_student_names)}')
print(f'Total destinatarios en COBROS: {len(cobros_names)}')

matched = cobros_names & all_student_names
unmatched_cobros = cobros_names - all_student_names
print(f'Coinciden exacto: {len(matched)}')
print(f'No coinciden (en COBROS pero no en categorias): {len(unmatched_cobros)}')
if unmatched_cobros:
    print(f'  Sin match: {sorted(unmatched_cobros)[:20]}')

# Check RENDICION deeper
print()
print('========== HOJA RENDICION - ANALISIS PROFUNDO ==========')
df_r = pd.read_excel(xl, sheet_name='RENDICION')
print(f'Filas: {len(df_r)}')
print()
# Main rendition data (left side)
print('--- Rendiciones (izquierda) ---')
for i, row in df_r.iterrows():
    dia = row.get('DIA')
    cant = row.get('CANTIDAD DEPAGOS')
    rubro = row.get('RUBRO')
    efec = row.get('$$$ EFECTIVO')
    trans = row.get('TRANSFERENCIAS')
    total = row.get('TOTAL')
    if pd.notna(dia):
        print(f'  {dia}: {cant} pagos, Rubro={rubro}, Efec={efec}, Trans={trans}, Total={total}')

# Right side - payments to staff
print()
print('--- Pagos a staff (derecha) ---')
for i, row in df_r.iterrows():
    fecha = row.get('FECHA')
    quien = row.get('QUIEN RECIBE')
    monto = row.get('MONTO ')
    acad = row.get('ACADEMIA')
    if pd.notna(fecha):
        print(f'  {fecha}: {quien} recibe ${monto} de {acad}')

# INFORMES
print()
print('========== HOJA INFORMES ==========')
df_inf = pd.read_excel(xl, sheet_name='INFORMES')
print(df_inf.to_string())
