'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

const projectId = "studio-239662212-1b7b6";

// ملاحظة للمطور: تأكد من إضافة هذه المتغيرات في إعدادات فيرسل (Environment Variables)
// NEXT_PUBLIC_FIREBASE_API_KEY
// NEXT_PUBLIC_FIREBASE_APP_ID
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: `${projectId}.firebaseapp.com`,
  projectId: projectId,
  storageBucket: `${projectId}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;

// تهيئة آمنة لا تكسر البناء (Build)
if (typeof window !== "undefined") {
    try {
        if (getApps().length) {
            app = getApp();
        } else {
            app = initializeApp(firebaseConfig);
        }

        if (app) {
            auth = getAuth(app);
            firestore = initializeFirestore(app, {
                experimentalForceLongPolling: true,
            });
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
    }
}

export { app, auth, firestore, firebaseConfig };
