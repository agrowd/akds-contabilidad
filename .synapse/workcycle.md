# Workcycle - 2026-09-11

## Sesión: Fecha de Nacimiento, Ficha Médica con Alertas, Baja No Destructiva y Sincronización con Academia

### Tareas Completadas:
- [x] **Fecha de Nacimiento**: Agregado campo `birth_date` a SQLite y Neon Postgres CRM. Inputs incluidos en `AddStudentModal`, `EditStudentModal` y ficha del alumno con cálculo dinámico de edad.
- [x] **Ficha Médica Anual (365 días) con Alerta 30 días**:
  - `medical_certificate_date` persistida en CRM y sincronizada con Academia.
  - Alertas visuales con 4 estados y símbolos: `🟢 Vigente`, `🟡 ¡Por Vencer! (< 30 días)`, `🔴 Vencida`, `❌ Sin Ficha`.
  - Edición rápida de fecha directamente desde la ficha del alumno.
  - Botón de WhatsApp `📱 Solicitar Ficha` con mensaje personalizado automático según el estado.
  - Filtro dedicado en la barra de búsqueda de alumnos (`Todas`, `🟢 Vigentes`, `🟡 Por Vencer`, `🔴 Vencidas`, `❌ Sin Ficha`).
- [x] **Reflejo de Deudas y Ficha en App de Asistencias (Academia)**:
  - Agregadas columnas en base de datos de Academia (`Student.debt_status`, `Student.debt_details`, `Student.medical_certificate_status`, `Student.status`, `Student.crm_id`).
  - Badges visuales en el llamado de lista diario de profesores: `🔴 Moroso`, `⚠️ Debe Cuota`, `🟡 Saldo Pendiente`, `🟢 Al Día`, `🟢 Ficha OK`, `🟡 Ficha Por Vencer`, `🔴 Ficha Vencida`, `❌ Sin Ficha`.
- [x] **Baja de Alumnos sin Pérdida de Información**:
  - Acción `toggleStudentBaja` para dar de baja / reactivar alumnos desde el CRM.
  - No se borra ningún registro ni pago histórico. Los datos contables y de presentismo permanecen 100% intactos.
  - En Academia, los alumnos en BAJA se excluyen del llamado activo y se disponibilizan bajo un toggle `ℹ️ Ver dados de baja` para no entorpecer el día a día de los profesores.
- [x] **Cruza de Datos y Sincronización Automática**:
  - Algoritmo de cruce por `academia_id` y matching de nombres normalizado (Jaccard).
  - Botón `🔄 Sync Academia` en el CRM y acción `syncStudentsWithAcademiaAction`.
- [x] **Build & Deploy**:
  - `akds-dashboard` compilado con 0 errores y pusheado a `agrowd/akds-contabilidad`.
  - `academia` compilado con 0 errores y pusheado a `agrowd/academia-andar`.

### Estado Actual:
Ambos sistemas sincronizados en producción y funcionando armónicamente.

---

# Workcycle - 2026-04-22

## Sesión: Evolución a CRM y Despliegue Cloud

### Tareas Completadas:
- [x] **CRUD de Pagos**: Implementación de edición y borrado de pagos con sincronización de estados.
- [x] **Campos Pro**: Añadidos `monthly_quota` y `phone` a la tabla de alumnos.
- [x] **WhatsApp**: Integración de link de notificación de deuda automática.
- [x] **Estabilización UI**: Arreglo de errores de hidratación, `toLocaleString` en nulos y sintaxis CSS.
- [x] **Migración Cloud**: Preparación de `lib/db.ts` para soportar Vercel Postgres.
- [x] **Scripts de Infra**: Creados `init_postgres.ts` y `export_to_postgres.ts` para facilitar el paso a la nube.
- [x] **Push GitHub**: Código subido a `agrowd/akds-contabilidad`.
