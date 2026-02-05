import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const neonConnectionString = process.env.NEON_DATABASE_URL;

if (!neonConnectionString) {
  console.error('❌ NEON_DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

const sql = neon(neonConnectionString);

async function runPasswordMigration() {
  try {
    console.log('🔄 Running password_hash migration...');
    
    // Check if column already exists
    try {
      await sql`SELECT password_hash FROM users LIMIT 1`;
      console.log('✅ password_hash column already exists');
      return;
    } catch (error) {
      // Column doesn't exist, proceed with migration
      if (error.code === '42703' || error.message?.includes('password_hash') || error.message?.includes('column')) {
        console.log('📝 Adding password_hash column...');
      } else {
        throw error;
      }
    }
    
    // Add the password_hash column
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `;
    
    console.log('✅ password_hash column added successfully!');
    
    // Verify the column was added
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash';
    `;
    
    if (result.length > 0) {
      console.log('✅ Verification: password_hash column exists');
      console.log(`   Type: ${result[0].data_type}`);
    } else {
      console.warn('⚠️  Warning: Could not verify password_hash column was added');
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    if (error.code === '42703') {
      console.error('   This usually means the column already exists or there was a syntax error');
    }
    process.exit(1);
  }
}

// Run the migration
runPasswordMigration()
  .then(() => {
    console.log('✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

