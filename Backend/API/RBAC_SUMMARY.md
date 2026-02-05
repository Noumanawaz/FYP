# Role-Based Access Control (RBAC) - Implementation Summary

## ✅ What's Been Implemented

### 1. **RBAC Middleware** (`src/middleware/rbac.ts`)
- `requireRole(...roles)` - Require specific role(s)
- `requireAdmin` - Admin only
- `requireRestaurantOwnerOrAdmin` - Restaurant owner or admin
- `requireAnyRole` - Any authenticated user
- `requireRestaurantOwnership` - Restaurant ownership check

### 2. **JWT Authentication with Roles**
- JWT tokens now include user role
- `AuthService` generates tokens with role information
- Token verification includes role validation

### 3. **Protected Routes**

#### **Admin Only:**
- `GET /api/v1/users` - List all users
- `DELETE /api/v1/users/:id` - Delete user
- `DELETE /api/v1/restaurants/:id` - Delete restaurant
- `GET /api/v1/mongodb/*` - MongoDB statistics and logs

#### **Restaurant Owner or Admin:**
- `POST /api/v1/restaurants` - Create restaurant
- `PUT /api/v1/restaurants/:id` - Update restaurant
- `POST /api/v1/restaurants/:id/locations` - Add location
- `POST /api/v1/menu` - Create menu item
- `PUT /api/v1/menu/:id` - Update menu item
- `DELETE /api/v1/menu/:id` - Delete menu item
- `GET /api/v1/orders/restaurant/:restaurantId/history` - View restaurant orders
- `PATCH /api/v1/orders/:id/status` - Update order status

#### **Customer (Authenticated):**
- `GET /api/v1/orders/my-orders` - View own orders
- `GET /api/v1/orders/history` - View own order history
- `PUT /api/v1/users/:id` - Update own profile (cannot change role)

### 4. **Authentication Endpoints**
- `POST /api/v1/auth/login` - Login and get JWT token (includes role)
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/verify` - Verify token validity

## 🔐 How to Use

### 1. Create a User
```bash
POST /api/v1/users
{
  "name": "John Doe",
  "preferred_language": "en",
  "role": "customer"  # or "restaurant_owner" or "admin"
}
```

### 2. Login to Get Token
```bash
POST /api/v1/auth/login
{
  "user_id": "user-uuid-here"
}

# Response:
{
  "success": true,
  "data": {
    "access_token": "jwt-token-with-role",
    "refresh_token": "refresh-token",
    "user": {
      "user_id": "...",
      "name": "John Doe",
      "role": "customer"
    }
  }
}
```

### 3. Use Token in Requests
```bash
# Include token in header
Authorization: Bearer <access_token>

# Example: Get own orders (customer)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/orders/my-orders

# Example: Create restaurant (restaurant owner)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Restaurant", ...}' \
  http://localhost:3000/api/v1/restaurants
```

## 📋 Role Permissions Matrix

| Endpoint | Public | Customer | Restaurant Owner | Admin |
|----------|--------|----------|------------------|-------|
| GET /restaurants | ✅ | ✅ | ✅ | ✅ |
| POST /restaurants | ❌ | ❌ | ✅ | ✅ |
| DELETE /restaurants | ❌ | ❌ | ❌ | ✅ |
| GET /menu | ✅ | ✅ | ✅ | ✅ |
| POST /menu | ❌ | ❌ | ✅ | ✅ |
| GET /orders/my-orders | ❌ | ✅ | ✅ | ✅ |
| GET /orders/restaurant/:id/history | ❌ | ❌ | ✅ | ✅ |
| PATCH /orders/:id/status | ❌ | ❌ | ✅ | ✅ |
| GET /users | ❌ | ❌ | ❌ | ✅ |
| DELETE /users/:id | ❌ | ❌ | ❌ | ✅ |
| PUT /users/:id (own profile) | ❌ | ✅ | ✅ | ✅ |
| PUT /users/:id (change role) | ❌ | ❌ | ❌ | ✅ |

## 🧪 Testing RBAC

### Test as Customer
```bash
# 1. Create customer user
USER_ID=$(curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Customer", "preferred_language": "en"}' \
  | jq -r '.data.user_id')

# 2. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\"}" \
  | jq -r '.data.access_token')

# 3. Try to create restaurant (should fail - 403)
curl -X POST http://localhost:3000/api/v1/restaurants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", ...}'
# Expected: 403 Forbidden
```

### Test as Restaurant Owner
```bash
# 1. Create restaurant owner
USER_ID=$(curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Owner", "preferred_language": "en", "role": "restaurant_owner"}' \
  | jq -r '.data.user_id')

# 2. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\"}" \
  | jq -r '.data.access_token')

# 3. Create restaurant (should succeed)
curl -X POST http://localhost:3000/api/v1/restaurants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Restaurant", ...}'
# Expected: 201 Created
```

### Test as Admin
```bash
# 1. Create admin user
USER_ID=$(curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Admin", "preferred_language": "en", "role": "admin"}' \
  | jq -r '.data.user_id')

# 2. Login
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\"}" \
  | jq -r '.data.access_token')

# 3. List all users (should succeed)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/users
# Expected: 200 OK with user list
```

## 🔧 Middleware Usage Examples

### In Routes
```typescript
import { authenticate } from "@/middleware/auth";
import { requireAdmin, requireRestaurantOwnerOrAdmin } from "@/middleware/rbac";

// Admin only
router.delete("/users/:id", authenticate, requireAdmin, controller.delete);

// Restaurant owner or admin
router.post("/restaurants", authenticate, requireRestaurantOwnerOrAdmin, controller.create);

// Custom role check
router.put("/users/:id", authenticate, requireRole("customer", "admin"), controller.update);
```

### In Controllers
```typescript
import { AuthRequest } from "@/middleware/auth";

static async someAction(req: Request, res: Response) {
  const authReq = req as AuthRequest;
  
  if (authReq.user?.role === "admin") {
    // Admin logic
  } else if (authReq.user?.role === "restaurant_owner") {
    // Restaurant owner logic
  }
}
```

## 📝 Notes

1. **JWT tokens include role** - Role is embedded in the token payload
2. **Role is checked on every request** - Middleware validates role from database
3. **Own profile updates** - Users can update their own profile, but only admins can change roles
4. **Restaurant ownership** - Currently restaurant owners can access any restaurant (TODO: add ownership mapping)

## 🚀 Next Steps

1. Add restaurant ownership mapping (restaurant_id → owner_id)
2. Implement fine-grained permissions
3. Add role-based data filtering
4. Create admin dashboard endpoints

## 📚 Documentation

- **RBAC Guide**: See `RBAC_GUIDE.md` for detailed documentation
- **API Docs**: http://localhost:3000/api-docs
- **User Roles**: See `USER_ROLES.md`

