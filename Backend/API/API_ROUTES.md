# API Routes Summary

## Base URL
```
http://localhost:3000/api/v1
```

## 🔐 Authentication
Some endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 👥 Users (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | No | Get all users |
| GET | `/users/:id` | No | Get user by ID |
| POST | `/users` | No | Create new user |
| PUT | `/users/:id` | No | Update user |
| DELETE | `/users/:id` | No | Delete user |

**Example Create User:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "preferred_language": "en",
  "dietary_preferences": ["vegetarian"],
  "addresses": [{"street": "123 Main St", "city": "Lahore"}]
}
```

---

## 🍕 Restaurants (`/api/v1/restaurants`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/restaurants` | No | Get all restaurants (with filters) |
| GET | `/restaurants/:id` | No | Get restaurant by ID |
| GET | `/restaurants/search?keyword=...` | No | Search restaurants |
| GET | `/restaurants/:id/locations` | No | Get restaurant locations |
| POST | `/restaurants` | No | Create restaurant |
| POST | `/restaurants/:id/locations` | No | Add location to restaurant |
| PUT | `/restaurants/:id` | No | Update restaurant |
| DELETE | `/restaurants/:id` | No | Delete restaurant |

**Query Parameters for GET /restaurants:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `status` - Filter by status (active, inactive, pending)
- `price_range` - Filter by price (budget, mid-range, premium)
- `search` - Search term

---

## 🍽️ Menu (`/api/v1/menu`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/menu` | No | Get all menu items |
| GET | `/menu/:id` | No | Get menu item by ID |
| GET | `/menu/restaurant/:restaurantId` | No | Get restaurant menu |
| GET | `/menu/search?q=...` | No | Search menu items |
| POST | `/menu` | No | Create menu item |
| PUT | `/menu/:id` | No | Update menu item |
| DELETE | `/menu/:id` | No | Delete menu item |

**Query Parameters for GET /menu:**
- `page` - Page number
- `limit` - Items per page
- `restaurant_id` - Filter by restaurant
- `category_id` - Filter by category
- `search` - Search term

---

## 📦 Orders (`/api/v1/orders`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | Optional | Create new order |
| GET | `/orders/:id` | No | Get order by ID |
| GET | `/orders/my-orders` | **Yes** | Get current user's orders |
| GET | `/orders/history` | **Yes** | Get user order history (MongoDB) |
| GET | `/orders/restaurant/:restaurantId/history` | No | Get restaurant order history (MongoDB) |
| GET | `/orders/:id/items` | No | Get order items |
| PATCH | `/orders/:id/status` | No | Update order status |

**Create Order Example:**
```json
{
  "restaurant_id": "uuid",
  "location_id": "uuid",
  "order_type": "voice",
  "items": [
    {
      "item_id": "uuid",
      "quantity": 2,
      "variants": {"size": "large"},
      "special_instructions": "No onions"
    }
  ],
  "phone": "+1234567890",
  "delivery_address": "123 Main St",
  "voice_transcript": "I want 2 large pizzas"
}
```

**Order Status Values:**
- `pending`
- `confirmed`
- `preparing`
- `ready`
- `delivered`
- `cancelled`

---

## 📊 Order History

### User Order History
- **Endpoint:** `GET /api/v1/orders/history`
- **Auth:** Required (JWT)
- **Description:** Get complete order history for authenticated user from MongoDB
- **Query Params:** `page`, `limit`

### Restaurant Order History
- **Endpoint:** `GET /api/v1/orders/restaurant/:restaurantId/history`
- **Auth:** No (consider adding auth for restaurant owners)
- **Description:** Get all orders for a specific restaurant from MongoDB
- **Query Params:** `page`, `limit`

**Note:** Order history endpoints require MongoDB connection. If MongoDB is not available, these endpoints will return 503 error.

---

## 🏥 Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | API health status |

---

## 📝 Notes

1. **MongoDB Optional:** The server can start without MongoDB. Order history features require MongoDB connection.

2. **PostgreSQL Required:** Neon PostgreSQL is required for all main operations.

3. **Pagination:** Most list endpoints support pagination with `page` and `limit` query parameters.

4. **Filtering:** Many endpoints support filtering via query parameters.

5. **Error Responses:** All errors follow this format:
   ```json
   {
     "success": false,
     "error": "Error message"
   }
   ```

6. **Success Responses:** All success responses follow this format:
   ```json
   {
     "success": true,
     "data": {...},
     "message": "Optional message"
   }
   ```

---

## 🔗 Full API Documentation

Visit Swagger UI for interactive API documentation:
```
http://localhost:3000/api-docs
```

