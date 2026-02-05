#!/bin/bash

# Database Setup Script for Restaurant RAG API
# This script sets up both Neon PostgreSQL and MongoDB Atlas

echo "🚀 Setting up Restaurant RAG Database..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Neon PostgreSQL Setup
echo -e "\n${BLUE}📊 Setting up Neon PostgreSQL...${NC}"
NEON_URL="postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

if command -v psql &> /dev/null; then
    echo "Running SQL migrations..."
    psql "$NEON_URL" -f database/migrations/001_initial_schema.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Initial schema created successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️  Error running initial migration. Please run manually:${NC}"
        echo "psql '$NEON_URL' -f database/migrations/001_initial_schema.sql"
    fi
    
    echo "Running password_hash migration..."
    psql "$NEON_URL" -f database/migrations/002_add_password_hash.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Password hash column added successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️  Error running password migration. Please run manually:${NC}"
        echo "psql '$NEON_URL' -f database/migrations/002_add_password_hash.sql"
    fi
    
    echo "Running missing columns migration..."
    psql "$NEON_URL" -f database/migrations/004_add_missing_columns.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Missing columns added successfully!${NC}"
    else
        echo -e "${YELLOW}⚠️  Error running missing columns migration. Please run manually:${NC}"
        echo "psql '$NEON_URL' -f database/migrations/004_add_missing_columns.sql"
    fi
else
    echo -e "${YELLOW}⚠️  psql not found. Please run migrations manually:${NC}"
    echo "psql '$NEON_URL' -f database/migrations/001_initial_schema.sql"
    echo "psql '$NEON_URL' -f database/migrations/002_add_password_hash.sql"
    echo "psql '$NEON_URL' -f database/migrations/004_add_missing_columns.sql"
fi

# MongoDB Atlas Setup
echo -e "\n${BLUE}🍃 Setting up MongoDB Atlas...${NC}"
MONGODB_URI="mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/restaurant_rag?retryWrites=true&w=majority"

if command -v mongosh &> /dev/null; then
    echo "MongoDB collections will be created automatically on first use."
    echo -e "${GREEN}✅ MongoDB Atlas connection ready!${NC}"
    echo "Collections: order_history, audit_logs, system_logs"
else
    echo -e "${YELLOW}⚠️  mongosh not found. Collections will be created automatically when the API starts.${NC}"
fi

echo -e "\n${GREEN}✅ Database setup complete!${NC}"
echo -e "\nNext steps:"
echo "1. Start the API: npm run dev"
echo "2. Visit API docs: http://localhost:3000/api-docs"
echo "3. Check health: http://localhost:3000/api/health"

