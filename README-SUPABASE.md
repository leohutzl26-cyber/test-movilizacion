# Migración Completa a Supabase

Este documento describe la migración completa del sistema de movilización desde MongoDB + FastAPI hacia Supabase como backend completo.

## 🎯 Resumen de la Migración

### Arquitectura Original
- **Backend**: FastAPI con MongoDB
- **Frontend**: React llamando directamente a Supabase
- **Separación**: Frontend y backend eran sistemas independientes

### Nueva Arquitectura
- **Backend**: Supabase (Database + Functions + Auth)
- **Frontend**: React llamando a Supabase Functions
- **Integración**: Todo unificado en Supabase

## 📁 Estructura del Proyecto

```
test-movilizacion/
├── backend/                    # MongoDB + FastAPI (original)
├── frontend/                   # React (ya migrado a Supabase)
├── supabase/                   # 🆕 Configuración de Supabase
│   ├── schema.sql            # Esquema de base de datos
│   ├── migrate.js            # Script de migración
│   ├── functions/            # Supabase Functions
│   │   ├── auth-register/    # Registro de usuarios
│   │   ├── auth-login/       # Login de usuarios
│   │   ├── trips-create/     # Crear transportes
│   │   ├── trips-assign/     # Asignar conductores
│   │   ├── trips-update-status/ # Actualizar estado
│   │   ├── users-approve/    # Aprobar usuarios
│   │   └── stats-dashboard/  # Estadísticas del dashboard
│   └── package.json          # Dependencias para migración
├── test-supabase-integration.js # 🆕 Script de prueba
└── README-SUPABASE.md        # 🆕 Este documento
```

## 🔧 Configuración de Supabase

### 1. Crear Proyecto en Supabase
1. Ir a [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Configurar variables de entorno:
   ```bash
   REACT_APP_SUPABASE_URL=your_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

### 2. Ejecutar Script de Esquema
```bash
# Ir al directorio de supabase
cd supabase

# Instalar dependencias
npm install

# Ejecutar script de esquema (en la consola de Supabase)
# Copiar y pegar el contenido de schema.sql
```

### 3. Migrar Datos
```bash
# Ejecutar script de migración
node migrate.js
```

## 🚀 Supabase Functions

### Autenticación
- **auth-register**: Registro de usuarios con aprobación
- **auth-login**: Login con JWT tokens

### Gestión de Transportes
- **trips-create**: Crear nuevos transportes
- **trips-assign**: Asignar conductores y vehículos
- **trips-update-status**: Actualizar estado (pendiente → asignado → en_curso → completado)

### Gestión de Usuarios
- **users-approve**: Aprobar/rechazar usuarios por admin

### Estadísticas
- **stats-dashboard**: Dashboard completo con métricas

## 🔗 Actualización del Frontend

### 1. Nueva Capa de API
- `frontend/src/lib/supabase-api.js`: Nueva API unificada
- `frontend/src/contexts/AuthContext.js`: Contexto de autenticación actualizado
- `frontend/src/lib/api.js`: API wrapper actualizada

### 2. Funcionalidades Soportadas
✅ Registro y login de usuarios  
✅ Gestión de transportes (CRUD)  
✅ Asignación de conductores  
✌️ Seguimiento de kilometraje  
✌️ Panel de administración  
✌️ Reportes y estadísticas  

## 🧪 Pruebas de Integración

```bash
# Ejecutar script de prueba completa
node test-supabase-integration.js
```

El script prueba:
1. Conexión a la base de datos
2. Registro de usuarios
3. Creación de transportes
4. Asignación de conductores
5. Actualización de estados
6. Sistema de auditoría
7. Estadísticas del dashboard

## 📊 Tablas de Supabase

### Core Tables
- **profiles**: Usuarios con roles y permisos
- **trips**: Transportes con toda la información clínica
- **vehicles**: Vehículos con kilometraje y mantenimiento
- **origin_services**: Orígenes/destinos personalizados
- **clinical_staff**: Personal médico
- **audit_logs**: Auditoría completa del sistema

### RLS (Row Level Security)
- Política de seguridad granular
- Acceso basado en roles
- Auditoría automática de cambios

## 🔄 Flujos de Trabajo

### 1. Registro de Usuario
1. Usuario se registra → `auth-register`
2. Admin aprueba → `users-approve`
3. Usuario puede acceder al sistema

### 2. Gestión de Transportes
1. Solicitante crea transporte → `trips-create`
2. Coordinador asigna conductor → `trips-assign`
3. Conductor inicia viaje → `trips-update-status`
4. Conductor finaliza viaje → `trips-update-status`

### 3. Dashboard de Admin
- Estadísticas en tiempo real → `stats-dashboard`
- Gestión de usuarios y vehículos
- Auditoría completa del sistema

## 🛡️ Seguridad

### Autenticación
- JWT tokens
- WebAuthn listo para implementar
- RLS en base de datos

### Auditoría
- Registro completo de todas las acciones
- Seguimiento de cambios en datos sensibles
- Logs con usuario, acción, timestamp

## 🚦 Estados de Transición

### Transportes
```
pendiente → asignado → en_curso → completado
         ↓ cancelado
```

### Usuarios
```
pending → approved/rejected
```

### Vehículos
```
disponible → en_curso → en_mantenimiento/en_limpieza → disponible
         ↓ no_disponible
```

## 📞 Soporte

Para soporte técnico:
1. Revisar logs de Supabase Functions
2. Verificar RLS policies
3. Probar script de integración
4. Revisar consola del frontend

## 🔮 Próximos Pasos

1. **WebAuthn**: Implementar autenticación sin contraseña
2. **Notificaciones**: Integrar email/resend
3. **Móvil**: PWA para conductores
4. **Reportes**: PDF/Excel avanzados
5. **Mapas**: Integración con Google Maps

---

¡La migración a Supabase está completa! El sistema ahora tiene una arquitectura unificada, segura y escalable.