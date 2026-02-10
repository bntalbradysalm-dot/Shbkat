'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

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

// تهيئة تطبيق Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// تهيئة الخدمات
const auth = getAuth(app);

// استخدام initializeFirestore مع إعدادات إضافية لحل مشاكل الاتصال في بيئات العمل السحابية
const firestore = getApps().length 
  ? getFirestore(getApp()) 
  : initializeFirestore(app, {
      experimentalForceLongPolling: true, // تفعيل الاتصال عبر Long Polling لتجاوز قيود الشبكة
    });

export { app, auth, firestore, firebaseConfig };
