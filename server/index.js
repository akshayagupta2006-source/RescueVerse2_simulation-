require('dotenv').config();
const validateEnv = require('./config/validateEnv');
validateEnv();  // fail fast if config is broken

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const resultRoutes = require('./routes/results');
const scenarioRoutes = require('./routes/scenarios');
const analyticsRoutes = require('./routes/analytics');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser tools (no Origin) and local Vite ports during development
    if (!origin || origin === clientUrl || /^http:\/\/localhost:\d+$/.test(origin)) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);

// Routes
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/results',   resultRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
