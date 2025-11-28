'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';

// In a managed environment like Firebase App Hosting, the Admin SDK is automatically
// initialized with the correct project credentials and permissions.
if (!getApps().length) {
  initializeApp();
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
