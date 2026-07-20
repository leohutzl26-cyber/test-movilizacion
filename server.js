require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Confiar en el proxy inverso (Vercel, Render, etc.) para obtener la IP real del cliente
const PORT = process.env.PORT || 10000;

// Environment variables for Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('⚠️  ADVERTENCIA: JWT_SECRET no está configurado. La autenticación no funcionará correctamente.');
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('JWT_SECRET es obligatorio en producción. Configúralo en las variables de entorno de Vercel.');
  }
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables. Please set SUPABASE_URL/REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/REACT_APP_SUPABASE_SERVICE_ROLE_KEY');
}

// CORS configurado para orígenes permitidos
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:10000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (apps móviles, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Permitir cualquier subdominio de vercel.app del proyecto
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('No permitido por CORS'));
  },
  credentials: true
}));

// Rate limiting para endpoints de autenticación (prevenir fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // máximo 30 intentos por IP
  message: { error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting general para la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por IP
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Aplicar rate limiting a rutas de autenticación
app.use('/api/auth-login', authLimiter);
app.use('/api/auth-register', authLimiter);
app.use('/api/auth-change-password', authLimiter);

// Aplicar rate limiting general a toda la API
app.use('/api/', apiLimiter);

// Parse JSON bodies
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Load the Supabase Edge Functions (now local Node modules)
const functions = {
  'auth-login': require('./supabase/functions/auth-login'),
  'auth-register': require('./supabase/functions/auth-register'),
  'stats-dashboard': require('./supabase/functions/stats-dashboard'),
  'trips-assign': require('./supabase/functions/trips-assign'),
  'trips-create': require('./supabase/functions/trips-create'),
  'trips-update-status': require('./supabase/functions/trips-update-status'),
  'users-approve': require('./supabase/functions/users-approve'),
  'manage-catalogs': require('./supabase/functions/manage-catalogs'),
  'admin-users': require('./supabase/functions/admin-users'),
  'auth-change-password': require('./supabase/functions/auth-change-password')
};

// JWT Middleware to populate context.user
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  req.context = { user: null };

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.context.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        name: decoded.name,
        role: decoded.role,
        must_change_password: decoded.must_change_password
      };
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      // We don't block here, let the handler decide if it requires auth
    }
  }
  next();
};

app.use(authenticateToken);

// Instancia de cliente de Supabase con bypass para lógica del servidor
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint para actualizar estado de turno del conductor
app.post('/api/drivers/status', async (req, res) => {
  try {
    const userRole = req.context.user?.role;
    const userId = req.context.user?.id;

    if (userRole !== 'conductor' && userRole !== 'admin' && userRole !== 'coordinador' && userRole !== 'personal_clinico') {
      return res.status(403).json({ error: 'Acceso denegado: Se requiere perfil de Conductor, Personal Clínico, Coordinador o Administrador' });
    }

    const { is_working, current_vehicle_id } = req.body;
    const targetUserId = req.body.driver_id || userId;

    const updatePayload = { 
      is_working: is_working !== undefined ? is_working : false,
      current_vehicle_id: current_vehicle_id || null 
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetUserId)
      .select()
      .maybeSingle();
      
    if (error) throw error;

    let profileData = data;
    if (!profileData) {
      const { data: upserted } = await supabase
        .from('profiles')
        .upsert({ id: targetUserId, ...updatePayload })
        .select()
        .maybeSingle();
      profileData = upserted || { id: targetUserId, ...updatePayload };
    }

    res.json({ message: 'Estado de turno actualizado', profile: profileData });
  } catch (e) {
    console.error("Error updating driver status:", e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint para consultar conductores y vehículos activos
app.get('/api/drivers/active', async (req, res) => {
  try {
    let drivers = [];
    
    // 1. Obtener todos los perfiles de conductor
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, email, phone, is_working, current_vehicle_id, vehicle_plate, is_active')
        .eq('role', 'conductor');
      
      if (error) throw error;
      drivers = data || [];
    } catch (dbErr) {
      console.warn("Advertencia: No se pudo consultar esquema completo de profiles (posiblemente faltan columnas is_working/current_vehicle_id en Supabase). Reintentando con esquema basico.", dbErr.message);
      // Fallback: si falla por columnas nuevas no migradas, consultamos el esquema anterior
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, email, phone, vehicle_plate, is_active')
        .eq('role', 'conductor');
        
      if (error) throw error;
      drivers = (data || []).map(d => ({
        ...d,
        is_working: false,
        current_vehicle_id: null
      }));
    }

    // Filtrar conductores que estén explícitamente inactivos (si is_active es null o true, se consideran activos)
    const activeDriversList = drivers.filter(d => d.is_active !== false);
    
    // 2. Obtener traslados en curso
    let activeTrips = [];
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, driver_id, status, tracking_number')
        .eq('status', 'en_curso');
      if (error) throw error;
      activeTrips = data || [];
    } catch (e) {
      console.error("Error fetching active trips for drivers panel:", e.message);
    }
    
    // 3. Obtener catálogo de vehículos
    let vehicles = [];
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate, brand, model, zonal_number, type, status');
      if (error) throw error;
      vehicles = data || [];
    } catch (e) {
      console.error("Error fetching vehicles for drivers panel:", e.message);
    }
    
    // 4. Mapear conductores en base a turno y viajes activos
    const mappedDrivers = activeDriversList.map(d => {
      const trip = activeTrips.find(t => t.driver_id === d.id);
      const vehicle = vehicles.find(v => v.id === d.current_vehicle_id);
      
      let status = 'fuera_de_turno';
      if (d.is_working) {
        status = trip ? 'en_ruta' : 'disponible';
      }
      
      return {
        id: d.id,
        name: d.name,
        username: d.username,
        email: d.email,
        phone: d.phone,
        is_working: d.is_working,
        current_vehicle_id: d.current_vehicle_id,
        vehicle: vehicle ? {
          id: vehicle.id,
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          zonal_number: vehicle.zonal_number,
          type: vehicle.type
        } : null,
        active_trip: trip ? {
          id: trip.id,
          tracking_number: trip.tracking_number
        } : null,
        status // 'fuera_de_turno' | 'disponible' | 'en_ruta'
      };
    });
    
    res.json({
      drivers: mappedDrivers,
      vehicles: vehicles.map(v => {
        const driverUsing = activeDriversList.find(d => d.is_working && d.current_vehicle_id === v.id);
        return {
          id: v.id,
          plate: v.plate,
          brand: v.brand,
          model: v.model,
          zonal_number: v.zonal_number,
          type: v.type,
          status: v.status,
          assigned_driver: driverUsing ? {
            id: driverUsing.id,
            name: driverUsing.name
          } : null
        };
      })
    });
  } catch (e) {
    console.error("Error fetching active drivers:", e);
    res.status(500).json({ error: e.message });
  }
});

// Create API routes for each function
Object.keys(functions).forEach(funcName => {
  app.post(`/api/${funcName}`, async (req, res) => {
    try {
      // Mock the Lambda event object
      const event = {
        body: req.rawBody || JSON.stringify(req.body)
      };

      // Call the handler
      const result = await functions[funcName].handler(event, req.context);

      // Send the response
      res.status(result.statusCode || 200).send(result.body);
    } catch (error) {
      console.error(`Error executing ${funcName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Any other GET request not handled by the API returns the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/*`);
  });
}

module.exports = app;
