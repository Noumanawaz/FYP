/**
 * Script to run RBAC setup:
 * 1. Run migration to add owner_id to restaurants table
 * 2. Create admin account (admin@vocabite.com / 123321)
 * 
 * Run with: tsx database/migrations/run_rbac_setup.ts
 */

import { sql } from '../../src/config/database';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('📦 Running migration: Add owner_id to restaurants table...');
  
  try {
    // Add owner_id column to restaurants table
    await sql`
      ALTER TABLE restaurants 
      ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(user_id) ON DELETE SET NULL
    `;
    
    // Create index for faster owner lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id)
    `;
    
    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.code === '42710') {
      console.log('ℹ️  Migration already applied (owner_id column exists)');
    } else {
      throw error;
    }
  }
}

async function createAdminAccount() {
  console.log('\n👤 Creating admin account...');
  
  try {
    // Ensure password_hash column exists
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
    `;
    
    // Ensure role column exists
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'role'
        ) THEN
          ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer' 
          CHECK (role IN ('customer', 'restaurant_owner', 'admin'));
        END IF;
      END $$;
    `;
    
    // Hash password
    const password = '123321';
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create or update admin account
    const result = await sql`
      INSERT INTO users (
        email,
        name,
        role,
        preferred_language,
        password_hash,
        created_at,
        last_active_at
      )
      VALUES (
        'admin@vocabite.com',
        'System Administrator',
        'admin',
        'en',
        ${passwordHash},
        NOW(),
        NOW()
      )
      ON CONFLICT (email) 
      DO UPDATE SET
        role = 'admin',
        password_hash = EXCLUDED.password_hash,
        name = 'System Administrator',
        last_active_at = NOW()
      RETURNING user_id, email, name, role
    `;
    
    if (result.length > 0) {
      console.log('✅ Admin account created/updated successfully!');
      console.log('   Email: admin@vocabite.com');
      console.log('   Password: 123321');
      console.log('   Role: admin');
      console.log('   User ID:', result[0].user_id);
    } else {
      console.log('❌ Failed to create admin account');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error creating admin account:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting RBAC Setup...\n');
    
    // Test database connection
    await sql`SELECT NOW() as now`;
    console.log('✅ Database connection successful\n');
    
    // Run migration
    await runMigration();
    
    // Create admin account
    await createAdminAccount();
    
    console.log('\n🎉 RBAC setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Login with admin@vocabite.com / 123321');
    console.log('2. You will be redirected to /admin portal');
    console.log('3. Create restaurant owner accounts as needed');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error during RBAC setup:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

