import { sql } from "../src/config/database";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

/**
 * Script to create a test user with H-11 Islamabad location
 * This user will be close to the test restaurant for testing location features
 * Run with: npx tsx scripts/create-test-user-h11.ts
 */

async function createTestUser() {
  try {
    console.log("🚀 Creating test user near H-11 Islamabad...");

    const userId = uuidv4();
    const password = "test123"; // Simple password for testing
    const hashedPassword = await bcrypt.hash(password, 10);

    // H-11 Islamabad coordinates (close to restaurant at 33.6844, 73.0479)
    // Using a nearby location: H-11/4 (slightly different coordinates)
    const userAddress = {
      street: "House 45, Street 12, H-11/4",
      city: "Islamabad",
      province: "Islamabad Capital Territory",
      postal_code: "44000",
      country: "Pakistan",
      is_default: true,
    };

    // Create user
    const user = await sql`
      INSERT INTO users (
        user_id,
        name,
        email,
        phone,
        password_hash,
        role,
        preferred_language,
        favorite_restaurants,
        dietary_preferences,
        addresses,
        created_at,
        last_active_at
      ) VALUES (
        ${userId},
        ${"Test User H-11"},
        ${"testuser.h11@example.com"},
        ${"+92-300-9876543"},
        ${hashedPassword},
        ${"customer"},
        ${"en"},
        ${[]},
        ${["halal"]},
        ${[userAddress]},
        NOW(),
        NOW()
      )
      RETURNING user_id, name, email, phone, role, preferred_language, addresses
    `;

    console.log("✅ Test user created successfully!");
    console.log("\n📋 User Details:");
    console.log("   User ID:", user[0].user_id);
    console.log("   Name:", user[0].name);
    console.log("   Email:", user[0].email);
    console.log("   Phone:", user[0].phone);
    console.log("   Password:", password, "(for testing)");
    console.log("   Address:", userAddress.street + ", " + userAddress.city);
    console.log("\n📍 Location Info:");
    console.log("   Restaurant Location: H-11, Islamabad (33.6844, 73.0479)");
    console.log("   User Location: H-11/4, Islamabad (~33.6850, 73.0485)");
    console.log("   Distance: ~0.1 km (very close for testing)");
    console.log("\n🧪 Testing Commands:");
    console.log("   1. Login:");
    console.log(`      curl -X POST http://localhost:3000/api/v1/auth/login \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"email": "${user[0].email}", "password": "${password}"}'`);
    console.log("\n   2. Check nearby restaurants:");
    console.log(`      curl "http://localhost:3000/api/v1/restaurants/nearby?lat=33.6850&lng=73.0485&radius=5"`);
    console.log("\n   3. Check delivery zone (replace RESTAURANT_ID):");
    console.log(`      curl "http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/delivery-check?lat=33.6850&lng=73.0485"`);

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error creating test user:", error.message);
    if (error.code === "23505") {
      console.error("   User with this email or phone already exists!");
      console.error("   Try using a different email or phone number.");
    }
    process.exit(1);
  }
}

createTestUser();

