const { Server } = require('socket.io');
const config = require('../config/env');

class SocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize Socket.IO
   */
  initializeSocket(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.corsOrigin,
        credentials: true,
      },
    });

    // Middleware for authentication
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        // Allow anonymous connection for customers (table specific), but mark as guest
        socket.user = { role: 'guest' };
        return next();
      }

      try {
        const JWTUtils = require('../utils/jwt');
        const decoded = JWTUtils.verifyAccessToken(token);
        socket.user = decoded;
        next();
      } catch (err) {
        // Invalid token - fail connection or treat as guest?
        // Better to fail if token was attempted but invalid.
        next(new Error("Authentication error"));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id, 'Role:', socket.user?.role || 'guest');

      // Join kitchen room - RESTRICTED
      socket.on('join:kitchen', () => {
        if (!socket.user || (socket.user.role !== 'admin' && socket.user.role !== 'kitchen')) {
          console.warn('Unauthorized attempt to join kitchen:', socket.id);
          return; // Silently ignore or emit error
        }
        socket.join('kitchen');
        console.log('Kitchen staff joined:', socket.id);
      });

      // Join table room
      socket.on('join:table', (tableId) => {
        // Optional: Verify if user belongs to this table?
        // For now, allow open table joining as customers scan QR.
        socket.join(`table:${tableId}`);
        console.log(`Client joined table ${tableId}:`, socket.id);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    return this.io;
  }

  /**
   * Emit new order to kitchen
   */
  emitNewOrder(order) {
    if (this.io) {
      this.io.to('kitchen').emit('order:new', order);
    }
  }

  /**
   * Emit order status update
   */
  emitOrderStatusUpdate(orderId, status, tableId) {
    if (this.io) {
      // Notify kitchen
      this.io.to('kitchen').emit('order:statusUpdate', { orderId, status });

      // Notify specific table
      this.io.to(`table:${tableId}`).emit('order:statusUpdate', {
        orderId,
        status,
        tableId, // Added for frontend context
      });
    }
  }

  /**
   * Emit order completion to table
   */
  emitOrderComplete(orderId, tableId) {
    if (this.io) {
      this.io.to(`table:${tableId}`).emit('order:completed', { orderId });
    }
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = new SocketService();