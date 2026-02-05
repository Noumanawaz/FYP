# Create User - Request Format

## Endpoint

```
POST /api/v1/users
```

## Required Fields

- **name** (string) - User's full name
- **preferred_language** (string) - Must be either `"en"` or `"ur"`

## Optional Fields

- **email** (string) - Valid email address (must be unique if provided)
- **phone** (string) - Phone number (must be unique if provided)
- **favorite_restaurants** (array of UUIDs) - Array of restaurant IDs
- **dietary_preferences** (array of strings) - e.g., `["vegetarian", "halal", "gluten-free"]`
- **addresses** (array of objects) - User addresses. Each address can include:
  - `id` (string, optional) - Unique identifier for the address
  - `type` (string, optional) - Address type: "home", "work", or "other"
  - `label` (string, optional) - Address label (e.g., "Home", "Office")
  - `street` (string) - Street address or house number
  - `area` (string, optional) - Area or sector
  - `city` (string) - City name
  - `province` (string, optional) - Province or state
  - `postal_code` (string, optional) - Postal or zip code
  - `country` (string) - Country name
  - `lat` (number, optional) - Latitude coordinate
  - `lng` (number, optional) - Longitude coordinate
  - `address` (string, optional) - Full formatted address string
  - `is_default` (boolean, optional) - Whether this is the default address (default: false)

## Example Request (Minimal)

```json
{
  "name": "John Doe",
  "preferred_language": "en"
}
```

## Example Request (Complete)

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "preferred_language": "en",
  "favorite_restaurants": [],
  "dietary_preferences": ["vegetarian", "halal"],
    "addresses": [
      {
        "id": "addr-1",
        "type": "home",
        "label": "Home",
        "street": "123 Main Street",
        "area": "Gulberg",
        "city": "Lahore",
        "province": "Punjab",
        "postal_code": "54000",
        "country": "Pakistan",
        "lat": 31.5497,
        "lng": 74.3436,
        "address": "123 Main Street, Gulberg, Lahore, Punjab, Pakistan",
        "is_default": true
      },
      {
        "id": "addr-2",
        "type": "work",
        "label": "Office",
        "street": "456 Business Park",
        "area": "DHA",
        "city": "Lahore",
        "province": "Punjab",
        "postal_code": "54000",
        "country": "Pakistan",
        "lat": 31.5204,
        "lng": 74.3587,
        "address": "456 Business Park, DHA, Lahore, Punjab, Pakistan",
        "is_default": false
      }
    ]
}
```

## Example Request (Urdu User)

```json
{
  "name": "احمد علی",
  "phone": "+923001234567",
  "preferred_language": "ur",
  "dietary_preferences": ["halal"]
}
```

## cURL Examples

### Minimal User

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "preferred_language": "en"
  }'
```

### Complete User

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Ahmed",
    "email": "sarah@example.com",
    "phone": "+923001234567",
    "preferred_language": "ur",
    "favorite_restaurants": [],
    "dietary_preferences": ["halal", "vegetarian"],
    "addresses": [
      {
        "id": "addr-1",
        "type": "home",
        "label": "Home",
        "street": "456 Park Avenue",
        "area": "Clifton",
        "city": "Karachi",
        "province": "Sindh",
        "postal_code": "75500",
        "country": "Pakistan",
        "lat": 24.8138,
        "lng": 67.0225,
        "address": "456 Park Avenue, Clifton, Karachi, Sindh, Pakistan",
        "is_default": true
      }
    ]
  }'
```

## Response Format

### Success (201 Created)

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "preferred_language": "en",
    "favorite_restaurants": [],
    "dietary_preferences": ["vegetarian"],
    "addresses": [...],
    "created_at": "2025-11-26T14:50:00.000Z",
    "last_active_at": "2025-11-26T14:50:00.000Z"
  },
  "message": "User created successfully"
}
```

### Error (400 Bad Request)

```json
{
  "success": false,
  "error": "Validation failed",
  "data": [
    {
      "msg": "name is required",
      "param": "name"
    }
  ]
}
```

## Notes

1. **Email and Phone**: Both are optional, but if provided, they must be unique across all users
2. **Preferred Language**: Must be exactly `"en"` or `"ur"` (case-sensitive)
3. **Addresses**: Can be an empty array `[]` or an array of address objects
4. **Favorite Restaurants**: Array of restaurant UUIDs (can be empty initially)
5. **Dietary Preferences**: Array of strings (e.g., "vegetarian", "halal", "gluten-free", "vegan")

## Quick Test

The simplest user you can create:

```json
{
  "name": "Test User",
  "preferred_language": "en"
}
```
