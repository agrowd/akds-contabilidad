| ID | Decisión Técnica | La Razón (The Why) | Estado |
|:---|:---|:---|:---|
| D-01 | **SQLite Local** | Simplicidad y portabilidad para el cliente. | 🔒 LOCKED |
| D-02 | **Server Actions** | Evitar API endpoints innecesarios y simplificar el flujo de datos. | 🔒 LOCKED |
| D-03 | **syncMonthlyStatus** | Automatizar la lógica de mora para evitar errores manuales. | 🟢 ACTIVE |
| D-04 | **Vercel Postgres** | Migración para despliegue en Vercel (evitar read-only FS). | 🔒 LOCKED |
| D-15 | **Integración de Asistencias (Cross-Database)** | Visualización en tiempo real de asistencias leídas desde la base de datos de Neon de la academia (`Attendance`, `Student`, `Teacher`). Se conecta usando `@vercel/postgres` pool en `lib/attendanceDb.ts`, habilitando KPIs de presentismo, resumen por alumno y exportación sin duplicar almacenamiento. | 🔒 LOCKED |

