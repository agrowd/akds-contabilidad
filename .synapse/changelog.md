# Changelog

## [v1.4.0] - 2026-09-11
### Added
- **Fecha de Nacimiento**: Campo `birth_date` en estudiantes, modales de alta/edición y cálculo automático de edad en la tabla y ficha.
- **Ficha Médica Anual (365 días) con Alerta 30 días**:
  - Alertas visuales con 4 estados y símbolos: `🟢 Vigente`, `🟡 ¡Por Vencer! (< 30 días)`, `🔴 Vencida`, `❌ Sin Ficha`.
  - Edición rápida de fecha de ficha médica desde la ficha del alumno.
  - Botón directo `📱 Solicitar Ficha` por WhatsApp con plantilla de mensaje dinámica.
  - Filtro dedicado por estado de ficha médica en el buscador.
- **Baja No Destructiva de Alumnos**:
  - Opción `🚫 Dar de Baja` / `▶️ Reactivar Baja` desde el CRM sin borrar historial contable ni asistencias pasadas.
  - Exclusión automática del listado de asistencia diaria en Academia, con vista toggle opcional.
- **Reflejo de Deudas y Fichas en la App de Asistencias (Academia)**:
  - Indicadores visuales en el llamado de lista para profesores (`🔴 Moroso`, `⚠️ Debe Cuota`, `🟡 Saldo Pendiente`, `🟢 Al Día`, `🟢 Ficha OK`, `🟡 Por Vencer`, `🔴 Vencida`, `❌ Sin Ficha`).
- **Sincronización Bidireccional CRM ↔ Academia**:
  - Cruce automático de estudiantes con matching tolerante de nombres.
  - Botón `🔄 Sync Academia` en la barra de herramientas del CRM.

## [v1.1.0] - 2026-04-22
### Added
- CRUD completo de pagos (Editar/Eliminar).
- Campos `monthly_quota` y `phone` en alumnos.
- Botón de notificaciones de WhatsApp automáticas.
- Modal `EditPaymentModal`.

### Fixed
- Error `toLocaleString` en valores nulos.
- Error de sintaxis en `globals.css` que rompía los modales.
- Sugerencia de cuota en el registro de pagos.
