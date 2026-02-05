// Test database connections
// Run with: node database/test-connections.js

const { neon } = require("@neondatabase/serverless");
const mongoose = require("mongoose");

const NEON_URL = "postgresql://neondb_owner:npg_AyBk4NF9GDIJ@ep-weathered-mud-a4cuq0j9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const MONGODB_URI = "mongodb+srv://noumannawaz2004_db_user:Amadahmad1975@cluster0.vde4x5f.mongodb.net/restaurant_rag?retryWrites=true&w=majority";

async function testNeon() {
  console.log("🔍 Testing Neon PostgreSQL connection...");
  try {
    const sql = neon(NEON_URL);
    const result = await sql`SELECT NOW() as now, version() as version`;
    console.log("✅ Neon PostgreSQL connected!");
    console.log("   Server time:", result[0].now);
    console.log("   PostgreSQL version:", result[0].version.split(" ")[0] + " " + result[0].version.split(" ")[1]);
    return true;
  } catch (error) {
    console.error("❌ Neon PostgreSQL connection failed:", error.message);
    return false;
  }
}

async function testMongoDB() {
  console.log("\n🔍 Testing MongoDB Atlas connection...");
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB Atlas connected!");
    console.log("   Database:", mongoose.connection.db.databaseName);
    console.log("   Host:", mongoose.connection.host);
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error("❌ MongoDB Atlas connection failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Testing database connections...\n");

  const neonOk = await testNeon();
  const mongoOk = await testMongoDB();

  console.log("\n📊 Results:");
  console.log("   Neon PostgreSQL:", neonOk ? "✅ Connected" : "❌ Failed");
  console.log("   MongoDB Atlas:", mongoOk ? "✅ Connected" : "❌ Failed");

  if (neonOk && mongoOk) {
    console.log("\n✅ All database connections successful!");
    process.exit(0);
  } else {
    console.log("\n❌ Some connections failed. Please check your credentials.");
    process.exit(1);
  }
}

main();
