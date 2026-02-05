# User Roles

The system supports three user roles:

## Roles

1. **customer** (default)
   - Regular users who can place orders
   - Can view their own order history
   - Can manage their profile and preferences

2. **restaurant_owner**
   - Restaurant owners who manage their restaurants
   - Can view their restaurant's order history
   - Can manage menu items and restaurant details
   - Can update order statuses for their restaurant

3. **admin**
   - System administrators
   - Full access to all resources
   - Can manage all restaurants, users, and orders
   - Can view system-wide analytics

## Creating Users with Roles

### Customer (Default)
```json
{
  "name": "John Doe",
  "preferred_language": "en"
}
```
If `role` is not specified, it defaults to `"customer"`.

### Restaurant Owner
```json
{
  "name": "Restaurant Owner",
  "preferred_language": "en",
  "role": "restaurant_owner",
  "email": "owner@restaurant.com"
}
```

### Admin
```json
{
  "name": "Admin User",
  "preferred_language": "en",
  "role": "admin",
  "email": "admin@example.com"
}
```

## Updating User Role

```bash
curl -X PUT http://localhost:3000/api/v1/users/{user_id} \
  -H "Content-Type: application/json" \
  -d '{
    "role": "restaurant_owner"
  }'
```

## Database Schema

The `users` table has a `role` column:
- Type: `VARCHAR(20)`
- Default: `'customer'`
- Constraint: Must be one of: `'customer'`, `'restaurant_owner'`, `'admin'`
- Indexed for fast role-based queries

## Querying by Role

You can filter users by role in the database:
```sql
SELECT * FROM users WHERE role = 'restaurant_owner';
SELECT * FROM users WHERE role = 'admin';
```

## API Endpoints

All user endpoints support the role field:
- `POST /api/v1/users` - Create user (role optional, defaults to customer)
- `PUT /api/v1/users/:id` - Update user (including role)
- `GET /api/v1/users` - List all users (includes role)
- `GET /api/v1/users/:id` - Get user by ID (includes role)

## Future Enhancements

Role-based access control (RBAC) can be implemented:
- Middleware to check user roles
- Route protection based on roles
- Restaurant owners can only manage their own restaurants
- Admins have full access

