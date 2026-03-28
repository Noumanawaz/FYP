import { sql } from '../../src/config/database';
import fs from 'fs';
import path from 'path';

async function runFirebaseMigration() {
  try {
    const migrationPath = path.join(__dirname, '20260328_add_firebase_uid.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running Firebase UID migration...');
    await sql(sqlContent);
    console.log('✅ Migration successful! users table updated.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runFirebaseMigration();
