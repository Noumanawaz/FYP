# Role-Based Access Control (RBAC) Guide

## Overview

The API implements role-based access control with three user roles:

1. **customer** - Regular users
2. **restaurant_owner** - Restaurant owners/managers
3. **admin** - System administrators

## Role Hierarchy

```
Admin (highest)
  ↓
Restaurant Owner
  ↓
Customer (lowest)
```

## Access Control Rules

### Public Endpoints (No Auth Required)
- `POST /api/v1/users` - User registration
- `GET /api/v1/restaurants` - List restaurants
- `GET /api/v1/restaurants/:id` - Get restaurant details
- `GET /api/v1/menu` - List menu items
- `GET /api/v1/menu/:id` - Get menu item
- `GET /api/v1/menu/restaurant/:restaurantId` - Get restaurant menu
- `POST /api/v1/orders` - Create order (optional auth)

### Customer Endpoints (Auth Required)
- `GET /api/v1/orders/my-orders` - View own orders
- `GET /api/v1/orders/history` - View own order history
- `PUT /api/v1/users/:id` - Update own profile (cannot change role)

### Restaurant Owner Endpoints (Auth + Role Required)
- `POST /api/v1/restaurants` - Create restaurant
- `PUT /api/v1/restaurants/:id` - Update restaurant
- `POST /api/v1/restaurants/:id/locations` - Add location
- `POST /api/v1/menu` - Create menu item
- `PUT /api/v1/menu/:id` - Update menu item
- `DELETE /api/v1/menu/:id` - Delete menu item
- `GET /api/v1/orders/restaurant/:restaurantId/history` - View restaurant orders
- `PATCH /api/v1/orders/:id/status` - Update order status

### Admin Endpoints (Auth + Admin Role Required)
- `GET /api/v1/users` - List all users
- `DELETE /api/v1/users/:id` - Delete user
- `DELETE /api/v1/restaurants/:id` - Delete restaurant
- `PUT /api/v1/users/:id` - Update any user (can change role)
- `GET /api/v1/mongodb/*` - MongoDB statistics and logs

## Middleware Usage

### Require Authentication
```typescript
import { authenticate } from "@/middleware/auth";

router.get("/protected", authenticate, controller.handler);
```

### Require Specific Role
```typescript
import { requireRole } from "@/middleware/rbac";

router.post("/admin-only", authenticate, requireRole("admin"), controller.handler);
```

### Require Multiple Roles
```typescript
import { requireRestaurantOwnerOrAdmin } from "@/middleware/rbac";

router.post("/restaurant", authenticate, requireRestaurantOwnerOrAdmin, controller.handler);
```

### Pre-built Middleware
```typescript
import { 
  requireAdmin, 
  requireRestaurantOwnerOrAdmin,
  requireAnyRole 
} from "@/middleware/rbac";

// Admin only
router.delete("/resource/:id", authenticate, requireAdmin, controller.delete);

// Restaurant owner or admin
router.post("/menu", authenticate, requireRestaurantOwnerOrAdmin, controller.create);

// Any authenticated user
router.get("/profile", authenticate, requireAnyRole, controller.getProfile);
```

## Role Checks in Controllers

```typescript
import { AuthRequest } from "@/middleware/auth";

static async someAction(req: Request, res: Response) {
  const authReq = req as AuthRequest;
  
  // Check role
  if (authReq.user?.role === "admin") {
    // Admin logic
  } else if (authReq.user?.role === "restaurant_owner") {
    // Restaurant owner logic
  } else {
    // Customer logic
  }
}
```

## Example: Protecting Routes

### Restaurant Management (Restaurant Owner or Admin)
```typescript
router.post(
  "/restaurants",
  authenticate,
  requireRestaurantOwnerOrAdmin,
  RestaurantController.create
);
```

### Admin Only Operations
```typescript
router.delete(
  "/users/:id",
  authenticate,
  requireAdmin,
  UserController.delete
);
```

### User Profile Update (Own Profile or Admin)
```typescript
router.put(
  "/users/:id",
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if user is updating own profile or is admin
    if (req.user?.user_id !== req.params.id && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  },
  UserController.update
);
```

## Testing RBAC

### Test as Customer
```bash
# Get JWT token for customer
TOKEN="customer_jwt_token"

# Try to create restaurant (should fail)
curl -X POST http://localhost:3000/api/v1/restaurants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Restaurant", ...}'
# Expected: 403 Forbidden
```

### Test as Restaurant Owner
```bash
TOKEN="restaurant_owner_jwt_token"

# Create restaurant (should succeed)
curl -X POST http://localhost:3000/api/v1/restaurants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Restaurant", ...}'
# Expected: 201 Created
```

### Test as Admin
```bash
TOKEN="admin_jwt_token"

# Delete user (should succeed)
curl -X DELETE http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK
```

## Role Assignment

### During Registration
```json
{
  "name": "Restaurant Owner",
  "preferred_language": "en",
  "role": "restaurant_owner"
}
```

### Updating Role (Admin Only)
```bash
curl -X PUT http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "restaurant_owner"}'
```

## Security Best Practices

1. **Always validate roles server-side** - Never trust client-side role checks
2. **Use middleware for route protection** - Don't duplicate role checks
3. **Principle of least privilege** - Give minimum required access
4. **Audit role changes** - Log all role modifications
5. **Validate ownership** - Restaurant owners can only manage their restaurants

## Future Enhancements

- Restaurant ownership mapping (restaurant_id → owner_id)
- Fine-grained permissions (e.g., can_edit_menu, can_view_analytics)
- Role-based data filtering (restaurant owners see only their data)
- Permission groups for complex access patterns

