'use server';

import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Ensure Firebase is initialized only once
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

  if (fromUserId === toUserId) {
    return { success: false, error: 'لا يمكنك التحويل إلى نفسك.' };
  }

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
      const toUserData = toUserDoc.data();
      const fromBalance = fromUserData?.balance || 0;

      if (fromBalance < amount) {
        throw new Error('الرصيد غير كافٍ لإتمام العملية.');
      }

      // Perform the balance updates
      transaction.update(fromUserRef, { balance: fromBalance - amount });
      transaction.update(toUserRef, { balance: (toUserData?.balance || 0) + amount });

      const now = new Date().toISOString();

      // Create transaction record for the sender
      const fromTransactionRef = fromUserRef.collection('transactions').doc();
      transaction.set(fromTransactionRef, {
        userId: fromUserId,
        transactionDate: now,
        amount: amount,
        transactionType: `تحويل إلى ${toUserName}`,
        notes: `إلى رقم: ${toUserPhone}`
      });

      // Create transaction record for the recipient
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
