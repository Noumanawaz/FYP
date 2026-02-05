import { neon, neonConfig } from '@neondatabase/serverless';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// ====== Neon PostgreSQL Configuration ======
neonConfig.fetchConnectionCache = true;
// Increase timeout for connection
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

const neonConnectionString = process.env.NEON_DATABASE_URL;

if (!neonConnectionString) {
  throw new Error('NEON_DATABASE_URL is not defined in environment variables');
}

// Validate connection string format
if (!neonConnectionString.startsWith('postgresql://') && !neonConnectionString.startsWith('postgres://')) {
  console.warn('⚠️  Warning: NEON_DATABASE_URL should start with postgresql:// or postgres://');
}

// Create Neon SQL client
export const sql = neon(neonConnectionString);

// Connection pool configuration
export const poolConfig = {
  min: parseInt(process.env.NEON_POOL_MIN || '2'),
  max: parseInt(process.env.NEON_POOL_MAX || '10'),
};

// Retry helper function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`⚠️  Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Test Neon connection with retry logic
export async function connectNeon(): Promise<void> {
  const maxRetries = parseInt(process.env.NEON_CONNECTION_RETRIES || '3');
  
  try {
    await retryWithBackoff(async () => {
      // Use a timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000);
      });
      
      const connectionPromise = sql`SELECT NOW() as now`;
      
      const result = await Promise.race([connectionPromise, timeoutPromise]) as any[];
      
      if (!result || !result[0]) {
        throw new Error('Invalid response from database');
      }
      
      console.log('✅ Neon PostgreSQL connected successfully');
      console.log('   Server time:', result[0].now);
    }, maxRetries, 2000);
  } catch (error: any) {
    console.error('❌ Error connecting to Neon PostgreSQL after retries:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('timeout') || error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify NEON_DATABASE_URL is correct in .env file');
      console.error('   3. Check if your Neon database is paused (free tier auto-pauses)');
      console.error('   4. Visit Neon dashboard to wake up the database if paused');
      console.error('   5. Check firewall/proxy settings');
      console.error('   6. Try increasing NEON_CONNECTION_RETRIES in .env');
    }
    
    throw error;
  }
}

// ====== MongoDB Atlas Configuration ======
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME || 'restaurant_rag';

if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

// MongoDB connection options
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Connect to MongoDB (optional - won't fail server startup)
export async function connectMongoDB(): Promise<void> {
  if (!mongoUri) {
    console.warn('⚠️  MONGODB_URI not configured, MongoDB features will be disabled');
    return;
  }
  
  try {
    await mongoose.connect(mongoUri, mongoOptions);
    console.log('✅ MongoDB Atlas connected successfully');
    console.log('   Database:', mongoose.connection.db?.databaseName);
  } catch (error: any) {
    console.warn('⚠️  MongoDB Atlas connection failed (order history will be unavailable):', error.message);
    console.warn('   Tip: Add your IP to MongoDB Atlas whitelist or use 0.0.0.0/0 for development');
    // Don't throw - allow server to start without MongoDB
  }
}

// Disconnect MongoDB
export async function disconnectMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Initialize all database connections
export async function initializeDatabases(): Promise<void> {
  try {
    // Neon is required
    await connectNeon();
    // MongoDB is optional
    await connectMongoDB();
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Error initializing databases:', error);
    throw error;
  }
}

// Check if MongoDB is connected
export function isMongoDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Graceful shutdown
export async function closeDatabases(): Promise<void> {
  try {
    await disconnectMongoDB();
    console.log('✅ All database connections closed');
  } catch (error) {
    console.error('❌ Error closing databases:', error);
    throw error;
  }
}

