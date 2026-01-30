import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
let app: admin.app.App | undefined;

export function getFirebaseAdmin(): admin.app.App {
  // Check if app already exists in admin.apps (handles serverless re-initialization)
  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }

  if (app) {
    return app;
  }

  // Check if required environment variables are set
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn("Firebase Admin SDK not configured. Push notifications will be disabled.");
    // Return a dummy app to prevent crashes
    return {} as admin.app.App;
  }

  try {
    // Parse the private key (handle escaped newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    };

    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log("Firebase Admin SDK initialized successfully");
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return {} as admin.app.App;
  }
}

// Get Firebase Messaging instance
export function getMessaging(): admin.messaging.Messaging | null {
  try {
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp.messaging) {
      return null;
    }
    return firebaseApp.messaging();
  } catch (error) {
    console.error("Failed to get Firebase Messaging instance:", error);
    return null;
  }
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}
