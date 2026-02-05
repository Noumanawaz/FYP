/**
 * Script to create admin account
 * Email: admin@vocabite.com
 * Password: 123321
 * Role: admin
 * 
 * Run with: node database/migrations/create_admin_account.js
 */

const { sql } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function createAdminAccount() {
  try {
    console.log('Creating admin account...');
    
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
      console.log('Email: admin@vocabite.com');
      console.log('Password: 123321');
      console.log('Role: admin');
      console.log('User ID:', result[0].user_id);
    } else {
      console.log('❌ Failed to create admin account');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    process.exit(1);
  }
}

createAdminAccount();

