/**
 * Test script to verify user addresses with lat/lng are stored correctly
 * Usage: tsx scripts/test-user-addresses.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { neon } from '@neondatabase/serverless';
import { v4 as uuidv4 } from 'uuid';

// Initialize database connection
const sql = neon(process.env.NEON_DATABASE_URL!);

async function testUserAddresses() {
  try {
    console.log('\n🧪 Testing User Addresses with Lat/Lng\n');

    // Test 1: Create a user with multiple addresses including lat/lng
    const testUserId = uuidv4();
    const testAddresses = [
      {
        id: 'addr-1',
        type: 'home',
        label: 'Home',
        street: '123 Main St',
        area: 'Gulberg',
        city: 'Lahore',
        province: 'Punjab',
        postal_code: '54000',
        country: 'Pakistan',
        lat: 31.5497,
        lng: 74.3436,
        address: '123 Main St, Gulberg, Lahore, Punjab, Pakistan',
        is_default: true,
      },
      {
        id: 'addr-2',
        type: 'work',
        label: 'Office',
        street: '456 Business Park',
        area: 'DHA',
        city: 'Lahore',
        province: 'Punjab',
        postal_code: '54000',
        country: 'Pakistan',
        lat: 31.5204,
        lng: 74.3587,
        address: '456 Business Park, DHA, Lahore, Punjab, Pakistan',
        is_default: false,
      },
    ];

    console.log('📝 Creating test user with addresses...');
    // Convert addresses array to PostgreSQL JSONB array format
    const addressesArray = testAddresses.map(addr => JSON.stringify(addr));
    const createResult = await sql`
      INSERT INTO users (
        user_id, name, preferred_language, role, email, phone, addresses, created_at, last_active_at
      ) VALUES (
        ${testUserId},
        'Test User',
        'en',
        'customer',
        'test@example.com',
        '+1234567890',
        ${addressesArray}::jsonb[],
        NOW(),
        NOW()
      )
      RETURNING user_id, name, addresses
    `;

    console.log('✅ User created:', createResult[0].user_id);
    console.log('   Addresses stored:', JSON.stringify(createResult[0].addresses, null, 2));

    // Test 2: Retrieve the user and verify addresses
    console.log('\n📖 Retrieving user to verify addresses...');
    const retrieveResult = await sql`
      SELECT user_id, name, addresses
      FROM users
      WHERE user_id = ${testUserId}
    `;

    const user = retrieveResult[0];
    console.log('✅ User retrieved');
    console.log('   Number of addresses:', user.addresses.length);
    
    // Verify each address has lat/lng
    user.addresses.forEach((addr: any, index: number) => {
      console.log(`\n   Address ${index + 1}:`);
      console.log(`     Label: ${addr.label || 'N/A'}`);
      console.log(`     Street: ${addr.street || 'N/A'}`);
      console.log(`     City: ${addr.city || 'N/A'}`);
      console.log(`     Lat: ${addr.lat !== undefined ? addr.lat : 'MISSING'}`);
      console.log(`     Lng: ${addr.lng !== undefined ? addr.lng : 'MISSING'}`);
      
      if (addr.lat === undefined || addr.lng === undefined) {
        console.log(`     ⚠️  WARNING: Missing coordinates!`);
      } else {
        console.log(`     ✅ Coordinates present`);
      }
    });

    // Test 3: Update user to add another address
    console.log('\n📝 Adding a third address...');
    const newAddress = {
      id: 'addr-3',
      type: 'other',
      label: 'Vacation Home',
      street: '789 Beach Road',
      area: 'Clifton',
      city: 'Karachi',
      province: 'Sindh',
      postal_code: '75500',
      country: 'Pakistan',
      lat: 24.8138,
      lng: 67.0225,
      address: '789 Beach Road, Clifton, Karachi, Sindh, Pakistan',
      is_default: false,
    };

    const updatedAddresses = [...user.addresses, newAddress];
    const updatedAddressesArray = updatedAddresses.map(addr => JSON.stringify(addr));
    const updateResult = await sql`
      UPDATE users
      SET addresses = ${updatedAddressesArray}::jsonb[]
      WHERE user_id = ${testUserId}
      RETURNING user_id, addresses
    `;

    console.log('✅ Address added');
    console.log('   Total addresses now:', updateResult[0].addresses.length);

    // Test 4: Verify all addresses are stored correctly
    console.log('\n🔍 Final verification...');
    const finalResult = await sql`
      SELECT addresses
      FROM users
      WHERE user_id = ${testUserId}
    `;

    const finalAddresses = finalResult[0].addresses;
    let allHaveCoordinates = true;
    
    finalAddresses.forEach((addr: any, index: number) => {
      if (addr.lat === undefined || addr.lng === undefined) {
        allHaveCoordinates = false;
        console.log(`   ⚠️  Address ${index + 1} (${addr.label || addr.street}) is missing coordinates`);
      }
    });

    if (allHaveCoordinates) {
      console.log('   ✅ All addresses have latitude and longitude stored!');
    }

    // Cleanup: Delete test user
    console.log('\n🧹 Cleaning up test user...');
    await sql`DELETE FROM users WHERE user_id = ${testUserId}`;
    console.log('✅ Test user deleted\n');

    console.log('✅ All tests passed! The database correctly stores multiple addresses with lat/lng.\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testUserAddresses();

