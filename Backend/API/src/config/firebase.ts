import * as admin from 'firebase-admin';
import { logger } from './logger';

const initializeFirebase = () => {
  try {
    // Check if Firebase already initialized
    if (admin.apps.length > 0) return admin.app();

    // Use environment variables or service account JSON
    // Strategy: Look for GOOGLE_APPLICATION_CREDENTIALS path first, 
    // then individual env vars for service account fields,
    // then fallback to project default (for cloud environments)
    
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines if they are in the env var
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      logger.info('✅ Firebase Admin initialized via Environment Variables');
    } else {
      // For local development, this will look for GOOGLE_APPLICATION_CREDENTIALS env var
      admin.initializeApp();
      logger.info('✅ Firebase Admin initialized (Default Application Credentials)');
    }
    
    return admin.app();
  } catch (error) {
    logger.error('❌ Firebase Admin initialization failed:', error);
    return null;
  }
};

export const firebaseApp = initializeFirebase();
export const firebaseAuth = admin.auth();
