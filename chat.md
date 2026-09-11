# Registro de Conversaciones - AKDs CRM

## Sesión: 2026-09-11
### Requerimiento del Usuario:
- Agregar fecha de nacimiento en el modal de alta de alumnos y en el perfil.
- Agregar ficha médica con vigencia de 1 año (365 días), con alerta previa de 30 días antes del vencimiento para solicitarla al joven. Formato fecha en perfil y símbolo de estado.
- Reflejar alumnos con deudas o atrasados en la app de toma de asistencias (Academia).
- Permitir dar de baja a alumnos suspendidos/inactivos desde el CRM sin perder información histórica ni contable.
- Cruzar datos entre CRM y Academia para que las listas coincidan.

### Respuestas y Soluciones Implementadas:
1. **Modelos y Migraciones**: Columnas añadidas a bases SQLite y Neon Postgres de ambos proyectos (irth_date, medical_certificate_date, cademia_id, status, debt_status, debt_details, medical_certificate_status, crm_id).
2. **CRM**:
   - Modales AddStudentModal y EditStudentModal con inputs de fecha de nacimiento y ficha médica.
   - Cálculo dinámico de edad y 4 estados de ficha médica con símbolos (🟢, 🟡, 🔴, ❌).
   - Card en la ficha del alumno con fecha editable y botón WhatsApp para solicitar o alertar sobre la ficha.
   - Filtro por estado de ficha médica y nuevo estado BAJA.
   - Botón de 🚫 Dar de Baja / ▶️ Reactivar Baja no destructivo.
   - Botón 🔄 Sync Academia y acción syncStudentsWithAcademiaAction con fuzzy matching.
3. **Academia**:
   - Prisma actualizado y tipado.
   - Pantalla de grupo AttendanceSheet.tsx con badges de morosidad/deuda de cuota y estado de ficha médica.
   - Exclusión de alumnos dados de baja del llamado diario con selector opcional Ver dados de baja.
