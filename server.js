require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS for frontend development
app.use(cors());

// Parse JSON bodies (but we'll pass them as strings to the handlers to match their expectations)
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
  'users-approve': require('./supabase/functions/users-approve')
};

// JWT Middleware to populate context.user
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  req.context = { user: null };

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.context.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role
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
