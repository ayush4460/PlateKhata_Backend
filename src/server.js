const app = require('./app');
const http = require('http');
const socketService = require('./services/socket.service');
const db = require('./config/database');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initializeSocket(server);

// Database connection test
const startServer = async () => {
  try {
    // Test database connection
    const result = await db.query('SELECT NOW()');
    console.log('PostgreSQL connected at:', result.rows[0].now);

    // Start server
    server.listen(PORT, () => {
      console.log('\n========================================');
      console.log('Server Status: RUNNING');
      console.log('========================================');
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`API Base: http://localhost:${PORT}/api/${process.env.API_VERSION}`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log('========================================\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n Shutting down gracefully...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    db.pool.end(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  gracefulShutdown();
});

// Start the server
startServer();