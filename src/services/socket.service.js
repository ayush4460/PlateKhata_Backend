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
    const allowedOrigins = [
      config.corsOrigin,
      config.frontendUrl,
      "https://platekhata.vercel.app",
      "https://www.platekhata.vercel.app",
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:9002",
      "http://127.0.0.1:9002",
      "https://platekhata.in",
      "https://www.platekhata.in",
    ].filter(Boolean);

    // Remove duplicates
    const uniqueOrigins = [...new Set(allowedOrigins)];

    console.log('Socket.IO Allowed Origins:', uniqueOrigins);

    this.io = new Server(server, {
      cors: {
        origin: uniqueOrigins,
        credentials: true,
        methods: ["GET", "POST"]
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
        if (!socket.user || (socket.user.role !== 'admin' && socket.user.role !== 'kitchen' && socket.user.role !== 'supervisor')) {
          console.warn('Unauthorized attempt to join kitchen:', socket.id);
          return; // Silently ignore or emit error
        }
        socket.join('kitchen');
        console.log('Kitchen staff joined:', socket.id);
      });

      // Join Admin/Restaurant Room - RESTRICTED
      socket.on('join:admin', () => {
         // Allow any authenticated user with a restaurantId (admin, manager, staff, etc.)
         if (!socket.user || !socket.user.restaurantId) {
             console.warn('Unauthorized attempt to join admin room (no restaurantId):', socket.id);
             return;
         }
         const roomName = `restaurant_${socket.user.restaurantId}`;
         socket.join(roomName);
         console.log(`User ${socket.user.userId} (${socket.user.role}) joined room ${roomName}:`, socket.id);
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

      // FIX: Emit to restaurant admin room as well!
      if (order.restaurant_id) {
          this.io.to(`restaurant_${order.restaurant_id}`).emit('order:new', order);
      }
    }
  }

  /**
   * Emit order status update
   */
  emitOrderStatusUpdate(orderId, status, tableId, restaurantId) {
    if (this.io) {
      // Notify kitchen
      this.io.to('kitchen').emit('order:statusUpdate', { orderId, status });

      // Notify specific table
      this.io.to(`table:${tableId}`).emit('order:statusUpdate', {
        orderId,
        status,
        tableId, // Added for frontend context
      });

      // Notify Restaurant Admin Dashboard
      if (restaurantId) {
          this.io.to(`restaurant_${restaurantId}`).emit('order:statusUpdate', {
              orderId,
              status,
              tableId
          });
      }
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
   * Emit table details update (customer name/phone, status)
   */
  emitTableUpdate(tableId, restaurantId, data) {
    if (this.io) {
        // Emit to restaurant admin channel
        this.io.to(`restaurant_${restaurantId}`).emit('table:update', {
            tableId,
            ...data
        });

        // Also emit order update to force refresh of order lists (legacy support)
        this.io.to(`restaurant_${restaurantId}`).emit('order:statusUpdate', {
             tableId,
             status: 'info-update' // Pseudo-status to trigger refetch
        });
        
        // Optional: Emit to specific table channel too (for customer device sync)
        this.io.to(`table:${tableId}`).emit('table:update', {
            tableId,
            ...data
        });
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