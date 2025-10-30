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

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join kitchen room
      socket.on('join:kitchen', () => {
        socket.join('kitchen');
        console.log('Kitchen staff joined:', socket.id);
      });

      // Join table room
      socket.on('join:table', (tableId) => {
        socket.join(`table:${tableId}`);
        console.log(`Customer joined table ${tableId}:`, socket.id);
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