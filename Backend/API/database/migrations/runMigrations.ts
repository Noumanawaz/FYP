import { sql } from '../../src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('🚀 Starting Database Migrations...');
  
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_add_password_hash.sql',
    '004_add_missing_columns.sql',
    '20260328_add_firebase_uid.sql'
  ];

  for (const file of migrationFiles) {
    try {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Migration file not found: ${file}, skipping...`);
        continue;
      }

      console.log(`📝 Running migration: ${file}...`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      // Split by semicolon to run multiple statements if needed, 
      // but neon client can handle multiple statements in one call usually
      await sql(sqlContent);
      console.log(`✅ ${file} completed successfully!`);
    } catch (error: any) {
      // Check if it's an "already exists" error, which we can ignore for simple migrations
      if (error.message?.includes('already exists') || error.message?.includes('duplicate column')) {
        console.log(`ℹ️  Skipping ${file} (already applied or schema conflict)`);
      } else {
        console.error(`❌ Error running ${file}:`, error.message);
        // We don't exit(1) here to allow the server to try and start anyway if some migrations fail
      }
    }
  }

  console.log('🏁 Migrations process finished.');
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('💥 Critical migration error:', err);
  process.exit(1);
});
