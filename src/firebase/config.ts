'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * إعدادات Firebase مع استخدام معرف المشروع الجديد: shbket
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "shbket"}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "shbket",
  storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "shbket"}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// تهيئة Firebase مرة واحدة فقط لضمان استقرار الخادم
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore, firebaseConfig };
