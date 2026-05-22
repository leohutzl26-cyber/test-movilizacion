# API Documentation - Sistema de Gestión de Transporte Hospitalario

## 🏥 Descripción General

Sistema de gestión de traslados hospitalales con frontend React, backend Express.js y base de datos Supabase. El sistema permite la coordinación de traslados clínicos y no clínicos entre diferentes áreas hospitalarias.

---

## 📡 Arquitectura

### Frontend (React + Tailwind CSS)
- **Framework**: React con Hooks
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: Context API
- **Icons**: Lucide React
- **PWA**: Soporte para Progressive Web App

### Backend (Express.js)
- **Servidor**: Express.js en puerto 10000
- **Proxy**: Funciones de Supabase como endpoints locales
- **Autenticación**: JWT + Supabase Auth
- **CORS**: Habilitado para desarrollo frontend

### Base de Datos (Supabase)
- **Motor**: PostgreSQL
- **Autenticación**: Supabase Auth
- **Realtime**: Soporte para tiempo real
- **Storage**: Almacenamiento de archivos

---

## 🔌 Endpoints API

### Autenticación

#### POST /api/auth-login
Iniciar sesión de usuario

**Request Body:**
```json
{
  "email": "admin@hospital.cl",
  "password": "admin123"
}
```

**Response:**
```json
{
  "data": {
    "user": { "id": "uuid", "email": "admin@hospital.cl", "name": "Admin User" },
    "session": { "access_token": "jwt_token" }
  }
}
```

#### POST /api/auth-register
Registrar nuevo usuario

**Request Body:**
```json
{
  "email": "user@hospital.cl",
  "password": "password123",
  "name": "User Name",
  "role": "solicitante"
}
```

### Gestión de Traslados

#### GET /api/trips
Obtener lista de traslados con filtros

**Query Parameters:**
- `status`: Filtrar por estado (pendiente, asignado, en_ruta, completado)
- `requester_id`: Filtrar por solicitante
- `driver_id`: Filtrar por conductor
- `startDate`: Fecha de inicio (formato YYYY-MM-DD)
- `endDate`: Fecha de fin (formato YYYY-MM-DD)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tracking_number": "TR-123456",
      "origin": "Hospital Central",
      "destination": "Clínica Las Condes",
      "patient_name": "John Doe",
      "status": "pendiente",
      "scheduled_date": "2026-05-22",
      "priority": "normal",
      "trip_type": "clinico"
    }
  ]
}
```

#### POST /api/trips
Crear nuevo traslado

**Request Body:**
```json
{
  "origin": "Hospital Central",
  "destination": "Clínica Las Condes",
  "patient_name": "John Doe",
  "priority": "normal",
  "trip_type": "clinico",
  "scheduled_date": "2026-05-22"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "tracking_number": "TR-123456",
    "status": "pendiente",
    "created_at": "2026-05-22T10:00:00Z"
  }
}
```

#### PUT /api/trips/{id}/status
Actualizar estado del traslado

**Request Body:**
```json
{
  "status": "asignado",
  "mileage": 1000,
  "cancel_reason": "Motivo de cancelación"
}
```

#### PUT /api/trips/{id}/manager-assign
Asignar conductor y vehículo al traslado

**Request Body:**
```json
{
  "driver_id": "uuid",
  "vehicle_id": "uuid"
}
```

#### PUT /api/trips/{id}/unassign
Desasignar conductor del traslado

#### PUT /api/trips/{id}/approve-gestor
Aprobar traslado por gestor

### Gestión de Usuarios

#### GET /api/users
Obtener lista de usuarios

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@hospital.cl",
      "name": "User Name",
      "role": "solicitante",
      "status": "approved"
    }
  ]
}
```

#### PUT /api/users/{id}/approve
Aprobar usuario

#### PUT /api/users/{id}/reject
Rechazar usuario

#### PUT /api/users/{id}/role
Actualizar rol de usuario

**Request Body:**
```json
{
  "role": "conductor"
}
```

### Gestión de Vehículos

#### GET /api/vehicles
Obtener lista de vehículos

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "plate": "ABC-123",
      "type": "ambulancia",
      "status": "disponible",
      "mileage": 50000
    }
  ]
}
```

#### PUT /api/vehicles/{id}/status
Actualizar estado del vehículo

**Request Body:**
```json
{
  "status": "en_mantenimiento"
}
```

#### PUT /api/vehicles/{id}/mileage
Actualizar kilometraje del vehículo

**Request Body:**
```json
{
  "mileage": 50500
}
```

### Gestión de Destinos

#### GET /api/destinations
Obtener lista de destinos

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Clínica Las Condes",
      "is_active": true
    }
  ]
}
```

#### POST /api/destinations
Crear nuevo destino

**Request Body:**
```json
{
  "name": "Nuevo Destino",
  "is_active": true
}
```

### Estadísticas y Dashboard

#### GET /api/stats/dashboard
Obtener estadísticas del dashboard

**Response:**
```json
{
  "data": {
    "active_trips": 5,
    "available_drivers": 3,
    "pending_requests": 2,
    "daily_stats": {
      "trips_completed": 15,
      "total_distance": 120.5
    }
  }
}
```

---

## 🔄 Estados de Traslados

| Estado | Descripción | Acciones Disponibles |
|--------|-------------|---------------------|
| `pendiente` | Traslado solicitado, no asignado | Asignar conductor, cancelar |
| `revision_gestor` | En revisión por gestor | Aprobar, rechazar |
| `asignado` | Conductor y vehículo asignados | Iniciar traslado, desasignar |
| `en_ruta` | Traslado en progreso | Completar, cancelar |
| `completado` | Traslado finalizado exitosamente | Ver detalles, generar reporte |
| `cancelado` | Traslado cancelado | Ver motivo de cancelación |

---

## 👥 Roles de Usuario

| Rol | Permisos | Responsabilidades |
|-----|----------|-------------------|
| `admin` | Acceso total | Gestión general del sistema |
| `solicitante` | Solicitar traslados, ver propios | Solicitar traslados para pacientes |
| `conductor` | Ver asignaciones, actualizar estado | Realizar traslados, actualizar kilometraje |
| `gestor` | Revisar, aprobar traslados | Aprobar solicitudes de traslado |
| `coordinador` | Gestión de recursos | Asignar conductores y vehículos |

---

## 🎨 Diseño y UI/UX

### Sistema de Colores
- **Primario**: Verde turquesa (#0F766E) - para acciones principales
- **Secundario**: Gris claro (#F1F5F9) - para fondos y bordes
- **Éxito**: Verde (#10B981) - para estados positivos
- **Advertencia**: Amarillo (#F59E0B) - para maintenance alerts
- **Error**: Rojo (#EF4444) - para errores críticos

### Tipografía
- **Headings**: Manrope, sans-serif (tracking: -0.02em)
- **Body**: Inter, sans-serif (leading: relaxed)
- **Monospace**: JetBrains Mono

### Componentes Específicos
- **DriverCard**: Tarjetas grandes con botones claros para conducción
- **StatusBadge**: Badges en forma de píldora con estados
- **DispatchMap**: Mapa interactivo para supervisores

---

## 📱 Mobile First Design

### App de Conductor
- **Tamaño mínimo de texto**: 16px para legibilidad
- **Touch targets**: Mínimo 44x44px
- **Interfaz simplificada**: Enfoque en acciones esenciales
- **Modo nocturno**: Soporte para turnos de noche

### Dashboard de Administración
- **Bento Grid**: Layout en cuadrícula para alta densidad de información
- **Mapa interactivo**: Vista general de traslados en tiempo real
- **Actualizaciones en tiempo real**: WebSocket para notificaciones

---

## 🔒 Seguridad

### Autenticación
- **JWT Tokens**: Para API authentication
- **Supabase Auth**: Para frontend authentication
- **CORS**: Configurado para dominios específicos

### Validaciones
- **Input validation**: En todos los endpoints
- **Rate limiting**: Para prevenir abusos
- **HTTPS**: En producción
- **Environment variables**: Credenciales no hardcodeadas

---

## 🚨 Manejo de Errores

### Códigos de Estado HTTP
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

### Formato de Error
```json
{
  "error": {
    "message": "Descripción del error",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Manejo de Errores Comunes
- **Autenticación fallida**: Verificar credenciales
- **Permisos insuficientes**: Revisar rol de usuario
- **Recursos no encontrados**: Verificar IDs
- **Validación fallida**: Revisar formato de datos

---

## 🔄 Flujos de Usuario

### Flujo de Solicitud de Traslado
1. Usuario solicita traslado (solicitante)
2. Sistema muestra opciones disponibles
3. Gestor revisa y aprueba (gestor)
4. Sistema asigna conductor y vehículo (automático)
5. Conductor recibe notificación
6. Conductor inicia traslado
7. Sistema actualiza estado en tiempo real
8. Traslado completado y registrado

### Flujo de Conductor
1. Conductor inicia sesión
2. Ve traslados asignados
3. Acepta traslado
4. Actualiza estado a "en_ruta"
5. Completa traslado y actualiza kilometraje
6. Sistema registra y notifica

### Flujo de Administración
1. Admin ve dashboard general
2. Monitrea traslados activos
3. Asigna recursos manualmente si es necesario
4. Genera reportes
5. Gestiona usuarios y vehículos

---

## 🧪 Pruebas

### Endpoints de Prueba
- `test-login.js`: Prueba de autenticación
- `test-app.js`: Prueba completa de la aplicación
- `test-supabase-integration.js`: Prueba de integración con Supabase

### Cuentas de Prueba
- **Admin**: admin@hospital.cl / admin123
- **Solicitante**: solicitante@hospital.cl / admin123
- **Conductor**: conductor@hospital.cl / admin123
- **Coordinador**: coordinador@hospital.cl / admin123

---

## 📋 Implementación

### Requisitos Previos
- Node.js 18+
- Supabase project
- Credenciales de Supabase

### Configuración
1. Clonar repositorio
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno: `.env`
4. Iniciar servidor: `node server.js`
5. Ejecutar migraciones: `schema.sql`
6. Cargar datos de prueba: `test-data.sql`

### Despliegue
- **Frontend**: Vercel, Netlify o similar
- **Backend**: Node.js en servidor
- **Base de datos**: Supabase

---

## 🔄 Actualizaciones

### Versión 1.0.0
- Gestión básica de traslados
- Autenticación de usuarios
- Dashboard básico
- App móvil para conductores

### Próximas Versiones
- Notificaciones push
- Integración con GPS
- Reportes avanzados
- Inteligencia artificial para optimización