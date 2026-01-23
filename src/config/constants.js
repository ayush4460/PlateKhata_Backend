module.exports = {
  // User roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    KITCHEN: 'kitchen',
    WAITER: 'waiter',
  },

  // Order statuses
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY: 'ready',
    SERVED: 'served',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  // Payment statuses
  PAYMENT_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },

  // Payment methods
  PAYMENT_METHOD: {
    CASH: 'cash',
    CARD: 'card',
    UPI: 'upi',
    ONLINE: 'online',
  },

  // Menu categories
  MENU_CATEGORIES: [
    'Beverages',
    'Starters',
    'Main Course',
    'Desserts',
    'Breads',
    'Specials',
  ],

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
  },
};