import { sql } from "../src/config/database";

async function getRestaurantId() {
  try {
    const result = await sql`
      SELECT restaurant_id, name 
      FROM restaurants 
      WHERE name LIKE '%H-11%' 
      LIMIT 1
    `;
    
    if (result[0]) {
      console.log("✅ Found Test Restaurant:");
      console.log("   Restaurant ID:", result[0].restaurant_id);
      console.log("   Name:", result[0].name);
      console.log("\n🧪 Use this ID in your tests!");
    } else {
      console.log("❌ Test restaurant not found. Run: npx tsx scripts/add-test-restaurant.ts");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

getRestaurantId();

