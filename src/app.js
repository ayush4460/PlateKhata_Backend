// src/app.js
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const startOrderSync = require('./cron/order-sync');

const app = express();

// Initialize Order Sync Cron
if (process.env.NODE_ENV !== 'test') { // Prevent running in tests
  startOrderSync();
}

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*' || 'http://localhost:5000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['x-session-token', 'Authorization']

  })
);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression Middleware
app.use(compression());

// ❌ REMOVED - No longer serving local static files (using Cloudinary now)
// app.use('/api/v1/uploads', express.static(path.join(__dirname, '../uploads')));
// app.use('/api/v1/qrcodes', express.static(path.join(__dirname, '../public/qrcodes')));

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate Limiting
app.use('/api/', apiLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Restaurant QR Ordering System API',
    version: '1.0.0',
    documentation: '/api/v1',
    health: '/health',
  });
});

// API Routes
app.use(`/api/${process.env.API_VERSION}`, routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global Error Handler
app.use(errorMiddleware);

module.exports = app;