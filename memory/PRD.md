# PRD - Sistema de Gestión de Traslados Hospitalarios

## Problema Original
PWA para gestión de traslados hospitalarios con RBAC (4 roles), gestión de conductores con turnos, control de flota con OCR de odómetro, alertas de mantenimiento, operación de viajes con bolsa de trabajo, y mantenedor de destinos frecuentes.

## Arquitectura
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Base de datos**: MongoDB (colecciones: users, vehicles, trips, destinations)
- **Integraciones**: OpenAI GPT-5.2 (OCR odómetro), Resend (email recuperación), JWT (autenticación)

## Roles de Usuario
1. **Administrador**: Gestión total, aprobación de usuarios
2. **Jefe de Turno**: Despacho operativo, gestión de conductores
3. **Solicitante**: Creación de pedidos de traslado
4. **Conductor**: Auto-asignación de viajes, registro de kilometraje

## Lo Implementado (Fase 1 - Feb 2026)
- [x] Auth JWT con registro, login, recuperación de contraseña (Resend)
- [x] RBAC con 4 roles y aprobación manual de usuarios
- [x] Panel Admin: usuarios, vehículos, destinos, estadísticas
- [x] Consola de Despacho (Jefe de Turno) con stats en tiempo real
- [x] Formulario de solicitud de traslado (Solicitante)
- [x] Vista Driver: bolsa de trabajo, auto-asignación, cambio de estado
- [x] OCR de odómetro con OpenAI GPT-5.2
- [x] Alertas de mantenimiento (amarillo/rojo)
- [x] Cambio manual de estado de vehículo (Limpieza/Taller)
- [x] Mantenedor de destinos frecuentes
- [x] Disponibilidad extra para conductores diurnos
- [x] Validación de licencia de conducir vencida

## Backlog (Priorizado)
### P0 (Crítico)
- Nada pendiente de la Fase 1

### P1 (Alto)
- Agrupación visual de viajes múltiples para conductores
- Reordenamiento de paradas en viajes agrupados
- Soporte 4to Turno (Largo-Noche-Libre-Libre) con calendario

### P2 (Medio)
- Notificaciones push en tiempo real
- Reportes y métricas exportables
- Historial de mantenimiento por vehículo
- PWA manifest + service worker para offline

### P3 (Bajo)
- Dashboard con mapa interactivo
- Gestión avanzada de turnos con calendario visual
- Exportación a Excel/PDF
