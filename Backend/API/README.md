# Restaurant RAG API

Complete Express + TypeScript backend for Restaurant RAG system with Neon PostgreSQL and MongoDB Atlas.

## 🏗️ Architecture

- **PostgreSQL (Neon)**: Main relational database for restaurants, menu items, orders
- **MongoDB Atlas**: Order history, audit logs, system logs
- **MongoDB MCP**: Model Context Protocol for MongoDB queries in Cursor
- **Express + TypeScript**: RESTful API
- **Swagger/OpenAPI**: API documentation

## 📁 Project Structure

```
Backend/API/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.ts  # Neon & MongoDB connections
│   │   └── logger.ts    # Winston logger
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # Data models
│   │   ├── postgres/    # PostgreSQL models
│   │   └── mongodb/     # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── swagger/         # Swagger documentation
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── database/
│   └── migrations/      # SQL migration files
├── logs/                # Log files
├── package.json
├── tsconfig.json
└── .env.example
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Neon PostgreSQL account
- MongoDB Atlas account

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your credentials
```

### Environment Variables

Create a `.env` file with these values:

```env
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Neon PostgreSQL
NEON_DATABASE_URL=postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# MongoDB Atlas
MONGODB_URI=mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/restaurant_rag?retryWrites=true&w=majority
MONGODB_DB_NAME=restaurant_rag

# JWT (Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**See [CONNECTION_STRINGS.md](./database/CONNECTION_STRINGS.md) for connection details.**

### Database Setup

1. **Test Connections First**:
   ```bash
   npm run test-db
   ```

2. **Neon PostgreSQL Migration**:
   ```bash
   # Option A: Use setup script
   npm run setup-db
   
   # Option B: Manual migration
   psql 'postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -f database/migrations/001_initial_schema.sql
   ```

3. **MongoDB Atlas**:
   - Collections are created automatically on first use
   - Collections: `order_history`, `audit_logs`, `system_logs`
   - No manual setup needed

### Running the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/health

## 🔌 MongoDB MCP Setup

This project uses MongoDB Atlas MCP for database queries in Cursor IDE.

**Configuration:** `.cursor/mcp.json` (see `MONGODB_MCP.md` for details)

**Connection String:**
```
mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/
```

**Collections:**
- `order_history` - Complete order history
- `audit_logs` - System audit trail
- `system_logs` - Application logs

See [MONGODB_MCP.md](./MONGODB_MCP.md) for full MCP setup instructions.

## 🔌 API Endpoints

### Restaurants
- `GET /api/v1/restaurants` - Get all restaurants
- `GET /api/v1/restaurants/:id` - Get restaurant by ID
- `GET /api/v1/restaurants/search?keyword=...` - Search restaurants
- `POST /api/v1/restaurants` - Create restaurant
- `PUT /api/v1/restaurants/:id` - Update restaurant
- `DELETE /api/v1/restaurants/:id` - Delete restaurant
- `GET /api/v1/restaurants/:id/locations` - Get locations
- `POST /api/v1/restaurants/:id/locations` - Add location

### Menu
- `GET /api/v1/menu` - Get all menu items
- `GET /api/v1/menu/:id` - Get menu item by ID
- `GET /api/v1/menu/restaurant/:restaurantId` - Get restaurant menu
- `GET /api/v1/menu/search?q=...` - Search menu items
- `POST /api/v1/menu` - Create menu item
- `PUT /api/v1/menu/:id` - Update menu item
- `DELETE /api/v1/menu/:id` - Delete menu item

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/:id` - Get order by ID
- `GET /api/v1/orders/my-orders` - Get user orders (auth required)
- `GET /api/v1/orders/history` - Get order history (auth required)
- `PATCH /api/v1/orders/:id/status` - Update order status

## 🔐 Authentication

Some endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <your-jwt-token>
```

## 📊 Database Schema

### PostgreSQL Tables (Neon)
- `restaurants` - Restaurant information
- `restaurant_locations` - Branch locations
- `menu_categories` - Menu categories
- `menu_items` - Menu items
- `menu_item_variants` - Item variants (sizes, add-ons)
- `deals_and_offers` - Promotional deals
- `embeddings` - Vector embeddings for RAG
- `users` - User accounts
- `orders` - Orders
- `order_items` - Order line items
- `user_interactions` - Query/response history
- `restaurant_metadata` - Flexible metadata storage

### MongoDB Collections (Atlas)
- `order_history` - Complete order history with status changes
- `audit_logs` - System audit trail
- `system_logs` - Application logs

## 🛠️ Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Build
npm run build
```

## 📝 Notes

- All timestamps are in UTC
- UUIDs are used for all primary keys
- Soft deletes are used (status flags)
- JSONB is used for flexible schema fields
- Vector embeddings stored as REAL[] arrays (can switch to pgvector)

## 🔄 Migration Strategy

1. Run SQL migrations on Neon
2. MongoDB collections auto-create
3. Use migration scripts for data seeding

## 📦 Dependencies

- **express** - Web framework
- **@neondatabase/serverless** - Neon PostgreSQL client
- **mongoose** - MongoDB ODM
- **winston** - Logging
- **swagger-ui-express** - API docs
- **express-validator** - Request validation
- **jsonwebtoken** - JWT authentication

## 🚨 Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## 📈 Performance

- Connection pooling for databases
- Indexes on frequently queried fields
- Rate limiting on API endpoints
- Compression middleware enabled

## 🔒 Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT authentication
- Input validation

## 📄 License

ISC

