# Environment Variables Reference

This document lists all environment variables required and optional for the Backend API.

## 📋 Required Variables

These variables **must** be set for the application to run:

### Database
```env
# Neon PostgreSQL connection string
NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Authentication
```env
# JWT secret for access tokens (min 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars

# JWT secret for refresh tokens (min 32 characters)
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-min-32-chars
```

## 🔧 Optional Variables (with defaults)

### Server Configuration
```env
# Node environment: development, production, test
NODE_ENV=development

# Server port
PORT=3000

# API version prefix
API_VERSION=v1
```

### Database Configuration
```env
# MongoDB database name
MONGODB_DB_NAME=restaurant_rag

# Neon connection pool minimum connections
NEON_POOL_MIN=2

# Neon connection pool maximum connections
NEON_POOL_MAX=10

# Number of retries for Neon connection
NEON_CONNECTION_RETRIES=3
```

### JWT Configuration
```env
# Access token expiration time
JWT_EXPIRES_IN=7d

# Refresh token expiration time
JWT_REFRESH_EXPIRES_IN=30d
```

### CORS Configuration
```env
# Comma-separated list of allowed origins
# Example: http://localhost:5173,http://localhost:3000
# For production: https://yourdomain.com
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Rate Limiting
```env
# Rate limit window in milliseconds (default: 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window
RATE_LIMIT_MAX_REQUESTS=100
```

### Logging
```env
# Log level: error, warn, info, debug
LOG_LEVEL=info
```

## 📝 Complete .env Example

Create a `.env` file in the `Backend/API` directory with the following:

```env
# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=3000
API_VERSION=v1

# ============================================
# Database Configuration
# ============================================

# Neon PostgreSQL (Required)
NEON_DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Neon Connection Pool Settings (Optional)
NEON_POOL_MIN=2
NEON_POOL_MAX=10
NEON_CONNECTION_RETRIES=3

# MongoDB Atlas (Required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
MONGODB_DB_NAME=restaurant_rag

# ============================================
# JWT Authentication (Required)
# ============================================
# Generate strong secrets using:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-min-32-chars
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# CORS Configuration
# ============================================
# Comma-separated list of allowed origins
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# ============================================
# Rate Limiting
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# Logging
# ============================================
LOG_LEVEL=info
```

## 🔐 Generating Secure Secrets

To generate secure JWT secrets, run:

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use OpenSSL:

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate JWT_REFRESH_SECRET
openssl rand -hex 32
```

## 🚨 Security Notes

1. **Never commit `.env` file to version control**
   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Use strong secrets in production**
   - Minimum 32 characters
   - Use cryptographically secure random generators
   - Never reuse secrets across environments

3. **Restrict CORS origins in production**
   - Don't use `*` in production
   - Specify exact domains

4. **Adjust rate limits for production**
   - Consider your API usage patterns
   - Monitor and adjust as needed

## 📍 Where Variables Are Used

| Variable | Used In | Purpose |
|----------|---------|---------|
| `NEON_DATABASE_URL` | `src/config/database.ts` | PostgreSQL connection |
| `MONGODB_URI` | `src/config/database.ts` | MongoDB connection |
| `JWT_SECRET` | `src/services/auth.service.ts` | Access token signing |
| `JWT_REFRESH_SECRET` | `src/services/auth.service.ts` | Refresh token signing |
| `CORS_ORIGIN` | `src/app.ts` | CORS configuration |
| `RATE_LIMIT_*` | `src/app.ts` | Rate limiting |
| `LOG_LEVEL` | `src/config/logger.ts` | Logging level |
| `PORT` | `src/server.ts` | Server port |
| `NODE_ENV` | Multiple files | Environment detection |

## ✅ Quick Checklist

Before running the server, ensure you have:

- [ ] `NEON_DATABASE_URL` - Valid PostgreSQL connection string
- [ ] `MONGODB_URI` - Valid MongoDB connection string
- [ ] `JWT_SECRET` - Strong random string (32+ chars)
- [ ] `JWT_REFRESH_SECRET` - Strong random string (32+ chars)
- [ ] `CORS_ORIGIN` - Set to your frontend URL(s)
- [ ] `.env` file created in `Backend/API/` directory

## 🔍 Testing Your Configuration

After setting up your `.env` file:

```bash
# Test database connections
npm run test-db

# Start the server
npm run dev

# Check health endpoint
curl http://localhost:3000/api/health
```

