# Database Connection Strings

## Neon PostgreSQL

**Connection String:**
```
postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**psql Command:**
```bash
psql 'postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

**Environment Variable:**
```env
NEON_DATABASE_URL=postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## MongoDB Atlas

**Connection String:**
```
mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/restaurant_rag?retryWrites=true&w=majority
```

**mongosh Command:**
```bash
mongosh "mongodb+srv://cluster0.vde4x5f.mongodb.net/" --apiVersion 1 --username noumannawaz2004_db_user --password Amadahmad1975
```

**Environment Variable:**
```env
MONGODB_URI=mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/restaurant_rag?retryWrites=true&w=majority
```

## Quick Setup

1. Copy these to your `.env` file
2. Run `npm run test-db` to verify connections
3. Run `npm run setup-db` to set up the database schema

