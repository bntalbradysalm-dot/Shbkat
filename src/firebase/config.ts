'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

/**
 * إعدادات Firebase الخاصة بمشروع: studio-239662212-1b7b6
 */
const projectId = "studio-239662212-1b7b6";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: `${projectId}.firebaseapp.com`,
  projectId: projectId,
  storageBucket: `${projectId}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// التحقق من وجود مفتاح API لتجنب أخطاء البناء في البيئات التي تفتقر للمتغيرات
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

if (typeof window !== "undefined" || isConfigValid) {
    try {
        app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        auth = getAuth(app);
        firestore = getApps().length 
          ? getFirestore(getApp()) 
          : initializeFirestore(app, {
              experimentalForceLongPolling: true,
            });
    } catch (error) {
        console.error("Firebase initialization failed during build or runtime:", error);
    }
}

export { app, auth, firestore, firebaseConfig };
