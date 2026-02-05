# Quick Start Guide

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd Backend/API
npm install
```

### 2. Database Connections

Your connection strings are already configured in `.env`:

**Neon PostgreSQL:**

```
postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**MongoDB Atlas:**

```
mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/restaurant_rag?retryWrites=true&w=majority
```

### 3. Test Database Connections

```bash
npm run test-db
```

This will test both Neon PostgreSQL and MongoDB Atlas connections.

### 4. Run Database Migration

**Option A: Using the setup script**

```bash
npm run setup-db
```

**Option B: Manual PostgreSQL migration**

```bash
psql 'postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -f database/migrations/001_initial_schema.sql
```

**MongoDB Collections:**

- Collections are created automatically when the API starts
- Collections: `order_history`, `audit_logs`, `system_logs`

### 5. Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### 6. Verify Everything Works

1. **Health Check**: http://localhost:3000/api/health
2. **API Documentation**: http://localhost:3000/api-docs
3. **Test Endpoint**:
   ```bash
   curl http://localhost:3000/api/v1/restaurants
   ```

## 📝 Environment Variables

The `.env` file is already configured with your connection strings. Make sure to:

1. Update `JWT_SECRET` with a strong random string (min 32 characters)
2. Update `JWT_REFRESH_SECRET` with another strong random string
3. Adjust `CORS_ORIGIN` if your frontend runs on a different port

## 🔍 Troubleshooting

### Connection Issues

**Neon PostgreSQL:**

- Verify connection string is correct
- Check if SSL mode is required
- Ensure database exists in Neon dashboard

**MongoDB Atlas:**

- Verify username/password
- Check IP whitelist in MongoDB Atlas (add `0.0.0.0/0` for development)
- Ensure network access is enabled

### Migration Issues

If migration fails:

1. Check if tables already exist
2. Verify connection string
3. Check Neon dashboard for any errors

### Port Already in Use

If port 3000 is busy:

```bash
# Change PORT in .env
PORT=3001
```

## 📚 Next Steps

1. Review API documentation at `/api-docs`
2. Test endpoints using Swagger UI
3. Create your first restaurant via API
4. Add menu items
5. Test order creation

## 🎯 Quick Test Commands

```bash
# Test connections
npm run test-db

# Check health
curl http://localhost:3000/api/health

# Get all restaurants
curl http://localhost:3000/api/v1/restaurants

# Create a restaurant (example)
curl -X POST http://localhost:3000/api/v1/restaurants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Restaurant",
    "country": "Pakistan",
    "price_range": "mid-range",
    "categories": ["fast food"],
    "specialties": ["pizza"],
    "keywords": ["test"],
    "food_categories": ["pizza"]
  }'
```

## 📖 Full Documentation

See [README.md](./README.md) for complete documentation.
