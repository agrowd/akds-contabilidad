| ID | Decisión Técnica | La Razón (The Why) | Estado |
|:---|:---|:---|:---|
| D-01 | **SQLite Local** | Simplicidad y portabilidad para el cliente. | 🔒 LOCKED |
| D-02 | **Server Actions** | Evitar API endpoints innecesarios y simplificar el flujo de datos. | 🔒 LOCKED |
| D-03 | **syncMonthlyStatus** | Automatizar la lógica de mora para evitar errores manuales. | 🟢 ACTIVE |
| D-04 | **Vercel Postgres** | Migración para despliegue en Vercel (evitar read-only FS). | 🔒 LOCKED |
| D-15 | **Integración de Asistencias (Cross-Database)** | Visualización en tiempo real de asistencias leídas desde la base de datos de Neon de la academia (`Attendance`, `Student`, `Teacher`). Se conecta usando `@vercel/postgres` pool en `lib/attendanceDb.ts`, habilitando KPIs de presentismo, resumen por alumno y exportación sin duplicar almacenamiento. | 🔒 LOCKED |
| D-16 | **Baja No Destructiva y Sincronización de Deuda/Ficha con Academia** | La baja de alumnos desactiva el llamado de lista diario en Academia sin borrar registros contables ni asistencias históricas. La deuda y el estado de la ficha médica se cruzan y sincronizan entre CRM y Academia mediante `academia_id` y matching de nombres normalizado. | 🔒 LOCKED |
| D-17 | **Alcance de Asistencias: Profesores vs Seguimiento de Pagos (Rocío)** | En el módulo de asistencias (`/asistencias`) solo se computan y analizan los registros y alumnos de los profesores Roberto, Santiago y Sebastián. Los alumnos y grupos de Rocío (adultos/torneos) no toman asistencia y se utilizan exclusivamente para el seguimiento contable de cuotas y deudas en `/cobros` y en Academia. | 🔒 LOCKED |

