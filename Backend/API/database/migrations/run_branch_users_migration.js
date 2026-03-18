import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const neonConnectionString = process.env.NEON_DATABASE_URL;

if (!neonConnectionString) {
  console.error('❌ NEON_DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

const sql = neon(neonConnectionString);

async function runMigration() {
  try {
    console.log('🔄 Running branch_users migration...');
    
    // Add the restaurant_id and location_id columns
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS restaurant_id UUID,
      ADD COLUMN IF NOT EXISTS location_id UUID;
    `;
    
    console.log('✅ restaurant_id and location_id columns added successfully!');
    
    // Verify the columns were added
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('restaurant_id', 'location_id');
    `;
    
    if (result.length > 0) {
      console.log('✅ Verification: columns exist');
      for (const row of result) {
        console.log(`   Col: ${row.column_name}, Type: ${row.data_type}`);
      }
    } else {
      console.warn('⚠️  Warning: Could not verify columns were added');
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
