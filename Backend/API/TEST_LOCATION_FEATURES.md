# Testing Location Features

This guide helps you test location-based features with a user near H-11 Islamabad.

## 🚀 Quick Setup

### 1. Create Test User Near H-11

```bash
cd Backend/API
npx tsx scripts/create-test-user-h11.ts
```

This creates a user with:
- **Email**: `testuser.h11@example.com`
- **Password**: `test123`
- **Location**: H-11/4, Islamabad (very close to test restaurant)
- **Distance from restaurant**: ~0.1 km

### 2. Get Restaurant ID

First, find the test restaurant ID:

```bash
curl http://localhost:3000/api/v1/restaurants/search?keyword=H-11
```

Or get all restaurants:

```bash
curl http://localhost:3000/api/v1/restaurants
```

Look for "Test Restaurant H-11" and note the `restaurant_id`.

## 🧪 Testing Steps

### Step 1: Login as Test User

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser.h11@example.com",
    "password": "test123"
  }'
```

**Save the `access_token` from the response!**

### Step 2: Test Nearby Restaurants

Test the `/restaurants/nearby` endpoint with H-11 coordinates:

```bash
curl "http://localhost:3000/api/v1/restaurants/nearby?lat=33.6850&lng=73.0485&radius=5"
```

**Expected Result**: Should return "Test Restaurant H-11" with distance ~0.1 km

### Step 3: Test Delivery Zone Check

Replace `RESTAURANT_ID` with the actual restaurant ID from Step 1:

```bash
curl "http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/delivery-check?lat=33.6850&lng=73.0485"
```

**Expected Result**:
```json
{
  "success": true,
  "data": {
    "canDeliver": true,
    "distance": 0.1,
    "nearestLocation": {
      "location_id": "...",
      "address": "H-11, Islamabad, Pakistan",
      "city": "Islamabad",
      "area": "H-11"
    }
  }
}
```

### Step 4: Test from Frontend

1. **Login** with the test user credentials
2. **Set location** to H-11/4, Islamabad (or use current location if you're nearby)
3. **Search for restaurants** - should show "Test Restaurant H-11"
4. **View restaurant details** - should show delivery available
5. **Check delivery zone** - should confirm delivery is possible

## 📍 Test Coordinates

- **Restaurant Location**: 33.6844, 73.0479 (H-11, Islamabad)
- **Test User Location**: 33.6850, 73.0485 (H-11/4, Islamabad)
- **Distance**: ~0.1 km (well within 5km delivery radius)

## 🧪 Additional Test Scenarios

### Test 1: User Outside Delivery Zone

Test with coordinates far from restaurant (e.g., Rawalpindi):

```bash
curl "http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/delivery-check?lat=33.5651&lng=73.0169"
```

**Expected**: `canDeliver: false`

### Test 2: User at Edge of Delivery Zone

Test with coordinates exactly 5km away:

```bash
# Calculate coordinates 5km away (approximately)
curl "http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/delivery-check?lat=33.7294&lng=73.0479"
```

### Test 3: Nearby Restaurants with Different Radius

```bash
# Small radius (1km) - should only show very close restaurants
curl "http://localhost:3000/api/v1/restaurants/nearby?lat=33.6850&lng=73.0485&radius=1"

# Large radius (20km) - should show more restaurants
curl "http://localhost:3000/api/v1/restaurants/nearby?lat=33.6850&lng=73.0485&radius=20"
```

## 🔍 Frontend Testing

### Using Location Selector

1. Open the app and click location selector
2. Search for "H-11 Islamabad" in the autocomplete
3. Select the address
4. Browse restaurants - should show nearby restaurants sorted by distance

### Using Current Location

1. Click "Use current location" (if you're in Islamabad)
2. App should reverse geocode your location
3. Show restaurants within delivery radius

### Testing Delivery Zone

1. Select a restaurant
2. View restaurant details
3. Check if delivery is available for your location
4. Should show distance and delivery time estimate

## 🐛 Troubleshooting

### User Not Found
- Make sure you ran the script: `npx tsx scripts/create-test-user-h11.ts`
- Check if email already exists (try different email)

### Restaurant Not Showing
- Verify restaurant exists: `curl http://localhost:3000/api/v1/restaurants`
- Check restaurant status is "active"
- Verify location status is "open"

### Delivery Zone Check Fails
- Verify coordinates are correct
- Check restaurant has a location with lat/lng
- Ensure delivery_zones.radius is set (default: 5km)

### Distance Calculation Issues
- Verify both restaurant and user locations have valid coordinates
- Check if coordinates are in correct format (lat, lng)

## 📊 Expected Results Summary

| Test | Endpoint | Expected Result |
|------|----------|----------------|
| Nearby Restaurants | `/restaurants/nearby?lat=33.6850&lng=73.0485` | Returns Test Restaurant H-11 with ~0.1km distance |
| Delivery Zone (Close) | `/restaurants/{id}/delivery-check?lat=33.6850&lng=73.0485` | `canDeliver: true`, distance ~0.1km |
| Delivery Zone (Far) | `/restaurants/{id}/delivery-check?lat=33.5651&lng=73.0169` | `canDeliver: false` |
| Login | `/auth/login` | Returns access_token and user data |

## 🎯 Next Steps

After testing location features:

1. Test order creation with location validation
2. Test cart validation (single restaurant per order)
3. Test delivery fee calculation based on distance
4. Test delivery time estimation

