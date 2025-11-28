'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// Ensure you have the service account key JSON file in your project
// and the GOOGLE_APPLICATION_CREDENTIALS environment variable is set.
// For local development, you might need to manually specify the path.
if (!getApps().length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp();
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // For environments where the service account is a stringified JSON
    initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  } else {
    // This is a fallback for local dev if the env var isn't set.
    // Ensure you have a service account file.
    try {
        const serviceAccount = require('../../../service-account.json');
        initializeApp({
            credential: cert(serviceAccount)
        });
    } catch (e) {
        console.error("Could not initialize Firebase Admin SDK. Please set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT environment variables, or provide a service-account.json file.");
    }
  }
}

const db = getFirestore();

interface TransferFundsParams {
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromUserName: string;
  toUserName: string;
  fromUserPhone: string;
  toUserPhone: string;
}

export async function transferFunds(params: TransferFundsParams): Promise<{success: boolean, error?: string}> {
  const { fromUserId, toUserId, amount, fromUserName, toUserName, fromUserPhone, toUserPhone } = params;

  if (amount <= 0) {
    return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر.' };
  }

  const fromUserRef = db.collection('users').doc(fromUserId);
  const toUserRef = db.collection('users').doc(toUserId);

  try {
    await db.runTransaction(async (transaction) => {
      const fromUserDoc = await transaction.get(fromUserRef);
      const toUserDoc = await transaction.get(toUserRef);

      if (!fromUserDoc.exists) {
        throw new Error('حساب المرسل غير موجود.');
      }
      if (!toUserDoc.exists) {
        throw new Error('حساب المستلم غير موجود.');
      }

      const fromUserData = fromUserDoc.data();
      const currentBalance = fromUserData?.balance || 0;

      if (currentBalance < amount) {
        throw new Error('الرصيد غير كافٍ لإتمام العملية.');
      }

      // 1. Deduct from sender, increment recipient
      transaction.update(fromUserRef, { balance: currentBalance - amount });
      transaction.update(toUserRef, { balance: (toUserDoc.data()?.balance || 0) + amount });

      const now = new Date().toISOString();

      // 2. Create transaction for sender
      const fromTransactionRef = fromUserRef.collection('transactions').doc();
      transaction.set(fromTransactionRef, {
        userId: fromUserId,
        transactionDate: now,
        amount: amount,
        transactionType: `تحويل إلى ${toUserName}`,
        notes: `إلى رقم: ${toUserPhone}`
      });

      // 3. Create transaction for recipient
      const toTransactionRef = toUserRef.collection('transactions').doc();
      transaction.set(toTransactionRef, {
        userId: toUserId,
        transactionDate: now,
        amount: amount,
        transactionType: `استلام من ${fromUserName}`,
        notes: `من رقم: ${fromUserPhone}`
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Transaction failed: ', error);
    return { success: false, error: error.message || 'فشل التحويل. الرجاء المحاولة مرة أخرى.' };
  }
}
