# Restaurant QR Ordering System - Backend API

Modern backend API for restaurant QR-based ordering system built with Node.js, Express.js, and PostgreSQL.

## Features

- ✅ User Authentication (JWT-based)
- ✅ Role-Based Access Control (Admin, Kitchen, Waiter)
- ✅ Menu Management
- ✅ Order Management
- ✅ Real-time Kitchen Updates (Socket.IO)
- ✅ Table Management with QR Codes
- ✅ Payment Integration Ready
- ✅ Receipt Generation
- ✅ RESTful API Design
- ✅ Input Validation
- ✅ Rate Limiting
- ✅ Security Best Practices

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Real-time:** Socket.IO
- **Validation:** express-validator
- **Security:** Helmet, bcryptjs, CORS
- **File Upload:** Multer
- **QR Codes:** qrcode

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 12
- npm >= 9.0.0

## Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd restaurant-qr-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Create PostgreSQL database**
```sql
CREATE DATABASE restaurant_qr_db;
```

5. **Run migrations**
```bash
npm run db:migrate
```

6. **Seed database (optional)**
```bash
npm run db:seed
```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Menu
- `GET /api/v1/menu` - Get all menu items
- `GET /api/v1/menu/:id` - Get menu item by ID
- `GET /api/v1/menu/categories` - Get all categories
- `GET /api/v1/menu/category/:category` - Get items by category
- `POST /api/v1/menu` - Create menu item (Admin)
- `PUT /api/v1/menu/:id` - Update menu item (Admin)
- `DELETE /api/v1/menu/:id` - Delete menu item (Admin)
- `PATCH /api/v1/menu/:id/availability` - Toggle availability

### Orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders` - Get all orders (Staff)
- `GET /api/v1/orders/:id` - Get order by ID
- `PATCH /api/v1/orders/:id/status` - Update order status (Staff)
- `PATCH /api/v1/orders/:id/cancel` - Cancel order
- `GET /api/v1/orders/kitchen/active` - Get active kitchen orders
- `GET /api/v1/orders/stats` - Get order statistics (Admin)

### Tables
- `GET /api/v1/tables` - Get all tables (Staff)
- `GET /api/v1/tables/:id` - Get table by ID (Staff)
- `GET /api/v1/tables/available` - Get available tables
- `POST /api/v1/tables` - Create table (Admin)
- `PUT /api/v1/tables/:id` - Update table (Admin)
- `DELETE /api/v1/tables/:id` - Delete table (Admin)

## Default Credentials

After seeding the database:
```
Email: admin@restaurant.com
Password: Admin@123
Role: admin

Email: smith@example.com
Password: Password123
ROle: kitchen
```

## Environment Variables

See `.env.example` for all required environment variables.

## Project Structure
```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── database/       # Migrations and seeds
├── middlewares/    # Express middlewares
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
├── validators/     # Input validators
├── app.js          # Express app
└── server.js       # Server entry point
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- CORS protection
- Helmet security headers
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## License

MIT

## Author

Ayush

## Support

For issues and questions, please open an issue on GitHub.
