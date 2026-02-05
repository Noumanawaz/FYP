import { sql } from "../src/config/database";
import { v4 as uuidv4 } from "uuid";

/**
 * Script to add a test restaurant in H-11 Islamabad
 * Run with: tsx scripts/add-test-restaurant.ts
 */

async function addTestRestaurant() {
  try {
    console.log("🚀 Adding test restaurant in H-11 Islamabad...");

    // H-11 Islamabad coordinates (approximate)
    // We'll geocode the exact address
    const restaurantId = uuidv4();
    const locationId = uuidv4();

    // Create restaurant
    const restaurant = await sql`
      INSERT INTO restaurants (
        restaurant_id,
        name,
        description,
        founded_year,
        country,
        price_range,
        categories,
        specialties,
        keywords,
        food_categories,
        logo_url,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${restaurantId},
        ${"Test Restaurant H-11"},
        ${JSON.stringify({
          en: "A test restaurant located in H-11 Islamabad for testing delivery zone functionality",
          ur: "H-11 اسلام آباد میں واقع ایک ٹیسٹ ریسٹوران",
        })},
        ${2024},
        ${"Pakistan"},
        ${"mid-range"},
        ${["Pakistani", "Fast Food", "Biryani"]},
        ${["Biryani", "Karahi", "BBQ"]},
        ${["H-11", "Islamabad", "test", "biryani", "karahi"]},
        ${["Biryani", "BBQ", "Fast Food"]},
        ${null},
        ${"active"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    console.log("✅ Restaurant created:", restaurant[0].name);

    // Create location for H-11 Islamabad
    // H-11 Islamabad coordinates: approximately 33.6844, 73.0479
    const location = await sql`
      INSERT INTO restaurant_locations (
        location_id,
        restaurant_id,
        city,
        area,
        address,
        lat,
        lng,
        phone,
        operating_hours,
        delivery_zones,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${locationId},
        ${restaurantId},
        ${"Islamabad"},
        ${"H-11"},
        ${"H-11, Islamabad, Pakistan"},
        ${33.6844},
        ${73.0479},
        ${"+92-300-1234567"},
        ${JSON.stringify({
          monday: { open: "10:00", close: "22:00", isClosed: false },
          tuesday: { open: "10:00", close: "22:00", isClosed: false },
          wednesday: { open: "10:00", close: "22:00", isClosed: false },
          thursday: { open: "10:00", close: "22:00", isClosed: false },
          friday: { open: "10:00", close: "22:00", isClosed: false },
          saturday: { open: "10:00", close: "22:00", isClosed: false },
          sunday: { open: "10:00", close: "22:00", isClosed: false },
        })},
        ${JSON.stringify({
          radius: 5, // 5km delivery radius
          type: "circle",
        })},
        ${"open"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    console.log("✅ Location created:", location[0].address);
    console.log("📍 Coordinates:", location[0].lat, location[0].lng);
    console.log("\n📋 Restaurant Details:");
    console.log("   Restaurant ID:", restaurantId);
    console.log("   Location ID:", locationId);
    console.log("   Name:", restaurant[0].name);
    console.log("   Address:", location[0].address);
    console.log("   Coordinates:", `${location[0].lat}, ${location[0].lng}`);
    console.log("\n✅ Test restaurant added successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding test restaurant:", error);
    process.exit(1);
  }
}

addTestRestaurant();
