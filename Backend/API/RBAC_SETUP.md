# RBAC Setup Guide

This guide will help you set up Role-Based Access Control (RBAC) for the Vocabite application.

## Prerequisites

- PostgreSQL database connection configured
- Node.js and npm installed
- Database migrations run

## Setup Steps

### 1. Run Database Migrations

First, run the migration to add the `owner_id` column to the restaurants table:

```bash
# Connect to your PostgreSQL database and run:
psql -d your_database_name -f database/migrations/003_add_restaurant_owner.sql
```

Or if using a connection string:
```bash
psql $DATABASE_URL -f database/migrations/003_add_restaurant_owner.sql
```

### 2. Create Admin Account

Run the Node.js script to create the admin account:

```bash
cd Vocabite/Backend/API
node database/migrations/create_admin_account.js
```

**Admin Credentials:**
- Email: `admin@vocabite.com`
- Password: `123321`
- Role: `admin`

### 3. Verify Setup

1. **Test Admin Login:**
   - Go to `/login` in your frontend
   - Login with `admin@vocabite.com` / `123321`
   - You should be redirected to `/admin`

2. **Test Restaurant Owner:**
   - Create a user with role `restaurant_owner` via API or signup
   - Login and you should be redirected to `/restaurant-owner`
   - Restaurant owners can create only ONE restaurant
   - They can add multiple locations (branches) to their restaurant

3. **Test Admin Portal:**
   - Access `/admin` route
   - You should see:
     - Users tab: List all users
     - Restaurants tab: List all restaurants, create/edit/delete restaurants

4. **Test Restaurant Owner Portal:**
   - Access `/restaurant-owner` route
   - You should see:
     - Create/Edit your restaurant (only one allowed)
     - Add multiple locations (branches) to your restaurant

## API Endpoints

### Admin Endpoints (Require Admin Role)
- `GET /api/v1/users` - List all users
- `DELETE /api/v1/users/:id` - Delete user
- `DELETE /api/v1/restaurants/:id` - Delete restaurant
- `PUT /api/v1/users/:id` - Update any user (can change role)
- `POST /api/v1/restaurants` - Create restaurant (can assign owner_id)

### Restaurant Owner Endpoints (Require Restaurant Owner Role)
- `POST /api/v1/restaurants` - Create restaurant (only one allowed, owner_id auto-set)
- `GET /api/v1/restaurants/my/restaurant` - Get my restaurant
- `PUT /api/v1/restaurants/:id` - Update my restaurant only
- `POST /api/v1/restaurants/:id/locations` - Add location to my restaurant

### Public Endpoints
- `GET /api/v1/restaurants` - List all restaurants
- `GET /api/v1/restaurants/:id` - Get restaurant details
- `GET /api/v1/restaurants/:id/locations` - Get restaurant locations

## Restaurant Schema

When creating a restaurant, use this schema:

```json
{
  "name": "string",
  "description": {},
  "founded_year": 0,
  "country": "string",
  "price_range": "budget" | "mid-range" | "premium",
  "categories": ["string"],
  "specialties": ["string"],
  "keywords": ["string"],
  "food_categories": ["string"],
  "logo_url": "string"
}
```

## Role Permissions

### Admin
- Full access to all resources
- Can create/edit/delete any restaurant
- Can assign restaurants to restaurant owners
- Can manage all users
- Can view system-wide analytics

### Restaurant Owner
- Can create only ONE restaurant
- Can edit only their own restaurant
- Can add multiple locations (branches) to their restaurant
- Can manage menu items for their restaurant
- Can view orders for their restaurant

### Customer
- Can view restaurants and menus
- Can place orders
- Can view their own order history
- Can manage their profile

## Troubleshooting

### Admin account not created
- Check database connection
- Ensure password_hash column exists in users table
- Check console for error messages

### Restaurant owner can't create restaurant
- Ensure they don't already have a restaurant
- Check that they have the `restaurant_owner` role
- Verify authentication token is valid

### Permission denied errors
- Check user role in database
- Verify JWT token includes role
- Check middleware is properly configured

## Swagger Documentation

API documentation is available at:
- Development: `http://localhost:3000/api-docs`
- All restaurant endpoints are documented with role requirements

## Next Steps

1. Test all role-based endpoints
2. Customize admin and restaurant owner portals as needed
3. Add additional features like analytics, reports, etc.
4. Implement fine-grained permissions if needed

