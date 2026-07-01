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
