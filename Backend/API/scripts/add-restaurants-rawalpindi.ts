import { sql } from "../src/config/database";
import { v4 as uuidv4 } from "uuid";

/**
 * Script to add 2 test restaurants in Rawalpindi Cantonment
 * Coordinates: lat=33.490129210898715, lon=73.11863803320338
 * Run with: npm exec tsx scripts/add-restaurants-rawalpindi.ts
 */

async function addRestaurants() {
  try {
    console.log("🚀 Adding 2 restaurants in Rawalpindi Cantonment...");

    const lat = 33.490129210898715;
    const lng = 73.11863803320338;
    const city = "Rawalpindi Cantonment";
    const area = "Rawalpindi Cantonment";
    const address = "Rawalpindi Cantonment 45730, Pakistan";

    // Restaurant 1: Spice Garden
    const restaurant1Id = uuidv4();
    const location1Id = uuidv4();

    console.log("\n📝 Adding Restaurant 1: Spice Garden...");

    const restaurant1 = await sql`
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
        ${restaurant1Id},
        ${"Spice Garden"},
        ${JSON.stringify({
          en: "Authentic Pakistani cuisine with a focus on traditional biryani, karahi, and BBQ dishes. Family-friendly restaurant with excellent service.",
          ur: "روایتی بریانی، کڑاہی اور باربی کیو پر توجہ دینے والا مستند پاکستانی کھانا۔ خاندانی دوستانہ ریسٹوران بہترین سروس کے ساتھ۔",
        })},
        ${2020},
        ${"Pakistan"},
        ${"mid-range"},
        ${["Pakistani", "Biryani", "BBQ", "Karahi"]},
        ${["Chicken Biryani", "Mutton Karahi", "BBQ Platter", "Nihari"]},
        ${["spice garden", "rawalpindi", "biryani", "karahi", "bbq", "pakistani food"]},
        ${["Biryani", "BBQ", "Karahi", "Traditional"]},
        ${null},
        ${"active"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    console.log("✅ Restaurant 1 created:", restaurant1[0].name);

    const location1 = await sql`
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
        ${location1Id},
        ${restaurant1Id},
        ${city},
        ${area},
        ${address},
        ${lat},
        ${lng},
        ${"+92-300-1111111"},
        ${JSON.stringify({
          monday: { open: "11:00", close: "23:00", isClosed: false },
          tuesday: { open: "11:00", close: "23:00", isClosed: false },
          wednesday: { open: "11:00", close: "23:00", isClosed: false },
          thursday: { open: "11:00", close: "23:00", isClosed: false },
          friday: { open: "11:00", close: "23:00", isClosed: false },
          saturday: { open: "11:00", close: "23:00", isClosed: false },
          sunday: { open: "11:00", close: "23:00", isClosed: false },
        })},
        ${JSON.stringify({
          radius: 10, // 10km delivery radius
          type: "circle",
        })},
        ${"open"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    console.log("✅ Location 1 created:", location1[0].address);

    // Restaurant 2: Burger Express
    const restaurant2Id = uuidv4();
    const location2Id = uuidv4();

    console.log("\n📝 Adding Restaurant 2: Burger Express...");

    const restaurant2 = await sql`
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
        ${restaurant2Id},
        ${"Burger Express"},
        ${JSON.stringify({
          en: "Fast food restaurant specializing in burgers, fries, and shakes. Quick service and affordable prices. Perfect for on-the-go meals.",
          ur: "برگر، فرائز اور شیک میں مہارت رکھنے والا فاسٹ فوڈ ریسٹوران۔ تیز سروس اور مناسب قیمتیں۔ سفر کے لیے بہترین کھانا۔",
        })},
        ${2022},
        ${"Pakistan"},
        ${"budget"},
        ${["Fast Food", "Burgers", "American", "Snacks"]},
        ${["Classic Burger", "Chicken Burger", "French Fries", "Milkshake"]},
        ${["burger express", "rawalpindi", "fast food", "burgers", "fries", "shakes"]},
        ${["Burgers", "Fast Food", "Snacks", "Beverages"]},
        ${null},
        ${"active"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    console.log("✅ Restaurant 2 created:", restaurant2[0].name);

    // Slightly offset coordinates for restaurant 2
    const lat2 = lat + 0.001;
    const lng2 = lng + 0.001;

    const location2 = await sql`
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
        ${location2Id},
        ${restaurant2Id},
        ${city},
        ${area},
        ${address},
        ${lat2},
        ${lng2},
        ${"+92-300-2222222"},
        ${JSON.stringify({
          monday: { open: "10:00", close: "22:00", isClosed: false },
          tuesday: { open: "10:00", close: "22:00", isClosed: false },
          wednesday: { open: "10:00", close: "22:00", isClosed: false },
          thursday: { open: "10:00", close: "22:00", isClosed: false },
          friday: { open: "10:00", close: "23:00", isClosed: false },
          saturday: { open: "10:00", close: "23:00", isClosed: false },
          sunday: { open: "10:00", close: "22:00", isClosed: false },
        })},
        ${JSON.stringify({
          radius: 8, // 8km delivery radius
          type: "circle",
        })},
        ${"open"},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    console.log("✅ Location 2 created:", location2[0].address);

    console.log("\n📋 Restaurant Details:");
    console.log("\n🍽️  Restaurant 1:");
    console.log("   Restaurant ID:", restaurant1Id);
    console.log("   Location ID:", location1Id);
    console.log("   Name:", restaurant1[0].name);
    console.log("   Address:", location1[0].address);
    console.log("   Coordinates:", `${location1[0].lat}, ${location1[0].lng}`);
    console.log("   Delivery Radius: 10km");

    console.log("\n🍔 Restaurant 2:");
    console.log("   Restaurant ID:", restaurant2Id);
    console.log("   Location ID:", location2Id);
    console.log("   Name:", restaurant2[0].name);
    console.log("   Address:", location2[0].address);
    console.log("   Coordinates:", `${location2[0].lat}, ${location2[0].lng}`);
    console.log("   Delivery Radius: 8km");

    console.log("\n✅ Both restaurants added successfully!");
    console.log("📍 Location: Rawalpindi Cantonment 45730, Pakistan");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding restaurants:", error);
    process.exit(1);
  }
}

addRestaurants();

