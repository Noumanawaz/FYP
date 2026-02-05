# Menu Categories Implementation

## ✅ What's Been Implemented

### 1. **Database Schema** (Already existed)
- `menu_categories` table with all required fields
- Foreign key relationship: `menu_items.category_id → menu_categories.category_id`
- Support for hierarchical categories (parent-child relationships)
- Indexes for performance

### 2. **TypeScript Types** (`src/types/index.ts`)
- `MenuCategory` interface
- `CreateMenuCategoryDto` interface
- `UpdateMenuCategoryDto` interface

### 3. **Model Layer** (`src/models/postgres/menu-categories.model.ts`)
- `findAll()` - Get all categories with filters and pagination
- `findById()` - Get category by ID
- `findByRestaurant()` - Get all categories for a restaurant
- `findChildren()` - Get child categories (subcategories)
- `findRootCategories()` - Get root categories (no parent)
- `create()` - Create new category
- `update()` - Update category
- `delete()` - Soft delete category (sets is_active = false)
- `getCategoryTree()` - Get hierarchical category tree

### 4. **Service Layer** (`src/services/category.service.ts`)
- Business logic for category operations
- Validation for parent category relationships
- Circular reference prevention
- Restaurant ownership validation

### 5. **Controller Layer** (`src/controllers/category.controller.ts`)
- RESTful endpoints for category operations
- Request/response handling
- Error handling

### 6. **Routes** (`src/routes/category.routes.ts`)
- `GET /api/v1/categories` - List all categories (public)
- `GET /api/v1/categories/:id` - Get category by ID (public)
- `GET /api/v1/categories/restaurant/:restaurantId` - Get restaurant categories (public)
- `GET /api/v1/categories/restaurant/:restaurantId/tree` - Get category tree (public)
- `GET /api/v1/categories/restaurant/:restaurantId/roots` - Get root categories (public)
- `GET /api/v1/categories/parent/:parentId/children` - Get child categories (public)
- `POST /api/v1/categories` - Create category (restaurant owner/admin)
- `PUT /api/v1/categories/:id` - Update category (restaurant owner/admin)
- `DELETE /api/v1/categories/:id` - Delete category (restaurant owner/admin)

## 🔗 Relationship with Menu Items

The relationship between menu categories and menu items is fully implemented:

1. **Database Level:**
   - `menu_items.category_id` → `menu_categories.category_id` (foreign key)
   - `ON DELETE RESTRICT` prevents deleting categories with menu items

2. **Model Level:**
   - `MenuItemModel.findByCategory()` - Get all items in a category
   - `MenuItemModel.findAll()` supports filtering by `category_id`

3. **Service Level:**
   - `MenuService.getAllMenuItems()` supports `category_id` filter
   - Menu items can be queried by category

## 📋 API Endpoints

### Public Endpoints (No Auth Required)

#### Get All Categories
```bash
GET /api/v1/categories?restaurant_id={uuid}&parent_category_id={uuid}&is_active=true&page=1&limit=20
```

#### Get Category by ID
```bash
GET /api/v1/categories/{category_id}
```

#### Get Restaurant Categories
```bash
GET /api/v1/categories/restaurant/{restaurant_id}?include_inactive=false
```

#### Get Category Tree (Hierarchical)
```bash
GET /api/v1/categories/restaurant/{restaurant_id}/tree
```

#### Get Root Categories
```bash
GET /api/v1/categories/restaurant/{restaurant_id}/roots
```

#### Get Child Categories
```bash
GET /api/v1/categories/parent/{parent_id}/children
```

### Protected Endpoints (Restaurant Owner/Admin Required)

#### Create Category
```bash
POST /api/v1/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "restaurant_id": "uuid",
  "name": "Appetizers",
  "parent_category_id": null,  // Optional, for subcategories
  "display_order": 1,
  "description": "Start your meal with these delicious appetizers",
  "image_url": "https://example.com/image.jpg",
  "is_active": true
}
```

#### Update Category
```bash
PUT /api/v1/categories/{category_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "display_order": 2,
  "is_active": true
}
```

#### Delete Category
```bash
DELETE /api/v1/categories/{category_id}
Authorization: Bearer {token}
```

## 🎯 Usage Examples

### 1. Create a Category
```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "restaurant-uuid",
    "name": "Main Courses",
    "display_order": 1,
    "description": "Our signature main dishes"
  }'
```

### 2. Create a Subcategory
```bash
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "restaurant-uuid",
    "name": "Chicken Dishes",
    "parent_category_id": "main-courses-category-uuid",
    "display_order": 1
  }'
```

### 3. Get Category Tree
```bash
curl http://localhost:3000/api/v1/categories/restaurant/{restaurant_id}/tree
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "category_id": "...",
      "name": "Appetizers",
      "children": [
        {
          "category_id": "...",
          "name": "Cold Appetizers",
          "children": []
        }
      ]
    }
  ]
}
```

### 4. Get Menu Items by Category
```bash
curl "http://localhost:3000/api/v1/menu?category_id={category_id}"
```

## 🔒 Security & Validation

1. **Role-Based Access Control:**
   - Create/Update/Delete: Restaurant Owner or Admin only
   - Read operations: Public

2. **Validation:**
   - Parent category must belong to same restaurant
   - Circular reference prevention
   - Cannot delete category with menu items
   - Cannot delete category with subcategories

3. **Data Integrity:**
   - Foreign key constraints prevent orphaned menu items
   - Soft delete (is_active = false) preserves data

## 📊 Database Schema

```sql
CREATE TABLE menu_categories (
    category_id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
    name VARCHAR(255) NOT NULL,
    parent_category_id UUID REFERENCES menu_categories(category_id),
    display_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE menu_items (
    item_id UUID PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(restaurant_id),
    category_id UUID NOT NULL REFERENCES menu_categories(category_id),
    -- ... other fields
);
```

## 🚀 Next Steps

1. **Enhanced Menu Item Responses:**
   - Include category information when fetching menu items
   - Add category name/description to menu item responses

2. **Category Ordering:**
   - Implement drag-and-drop reordering
   - Bulk update display_order

3. **Category Analytics:**
   - Most popular categories
   - Category-based sales reports

4. **Category Images:**
   - Image upload endpoint
   - CDN integration

## 📚 Related Files

- Database Migration: `database/migrations/001_initial_schema.sql`
- Types: `src/types/index.ts`
- Model: `src/models/postgres/menu-categories.model.ts`
- Service: `src/services/category.service.ts`
- Controller: `src/controllers/category.controller.ts`
- Routes: `src/routes/category.routes.ts`
- Menu Items Model: `src/models/postgres/menu-items.model.ts`

