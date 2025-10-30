require('dotenv').config();

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database - Add DATABASE_URL support
  db: {
    connectionString: process.env.DATABASE_URL, // Add this for production only
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN,

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
    path: process.env.UPLOAD_PATH || './uploads',
  },

  // Payment
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
  },

  // Frontend
  frontendUrl: process.env.FRONTEND_URL,
};

// Validate required environment variables
// Only require individual DB vars if DATABASE_URL is not provided
const requiredEnvVars = ['JWT_SECRET'];

if (!process.env.DATABASE_URL) {
  // If no DATABASE_URL, require individual DB variables
  requiredEnvVars.push('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD');
} else {
  // If DATABASE_URL exists, validate it
  requiredEnvVars.push('DATABASE_URL');
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

module.exports = config;