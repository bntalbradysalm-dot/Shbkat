'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * إعدادات Firebase الخاصة بمشروع: shbket
 * يتم جلب القيم من متغيرات البيئة لضمان الأمان والعمل الصحيح في بيئة الاستوديو.
 */
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "shbket";

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

// تهيئة الخدمات وتصديرها كنسخ مفردة (Singletons)
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore, firebaseConfig };
