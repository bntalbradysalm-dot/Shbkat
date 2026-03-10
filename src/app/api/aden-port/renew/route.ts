
import { NextResponse } from 'next/server';
import { initializeServerFirebase } from '@/firebase/server-init';
import { doc, getDoc, updateDoc, increment, collection, addDoc, writeBatch } from 'firebase/firestore';

const ODOO_URL = 'https://api.alwaadi.net/jsonrpc';
const ODOO_API_KEY = 'e3dc910be14a0f1ea325d6a0794a0e586227afae';

export async function POST(req: Request) {
  try {
    const { userId, subscriber_id, service_id, price, packageName, subscriberName } = await req.json();

    if (!userId || !subscriber_id || !service_id) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const { firestore } = initializeServerFirebase();
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const currentBalance = userSnap.data().balance || 0;
    if (currentBalance < price) {
      return NextResponse.json({ error: 'رصيدك غير كافٍ لإتمام العملية' }, { status: 400 });
    }

    // 1. تنفيذ التجديد في Odoo
    const odooResponse = await fetch(ODOO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ODOO_API_KEY}`
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "renewal.proces",
          method: "create",
          args: [{
            subscriber: subscriber_id,
            renewal_categories: service_id
          }]
        },
        id: 2
      })
    });

    const odooData = await odooResponse.json();

    if (odooData.error) {
      return NextResponse.json({ error: odooData.error.message || 'فشل التجديد في المنظومة' }, { status: 400 });
    }

    // 2. تحديث الرصيد وتسجيل العملية في Firebase
    const batch = writeBatch(firestore);
    const now = new Date().toISOString();

    batch.update(userRef, { balance: increment(-price) });

    const txRef = doc(collection(firestore, 'users', userId, 'transactions'));
    batch.set(txRef, {
      userId,
      transactionDate: now,
      amount: price,
      transactionType: 'تجديد بندر عدن',
      notes: `تجديد باقة ${packageName} للمشترك: ${subscriberName}`,
      subscriberName: subscriberName
    });

    const notifRef = doc(collection(firestore, 'users', userId, 'notifications'));
    batch.set(notifRef, {
      title: 'تم التجديد بنجاح',
      body: `تم تجديد باقة بندر عدن (${packageName}) بنجاح للمشترك ${subscriberName}.`,
      timestamp: now
    });

    await batch.commit();

    return NextResponse.json({ success: true, result: odooData.result });

  } catch (error: any) {
    console.error('Aden Port Renewal Error:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي أثناء معالجة الطلب' }, { status: 500 });
  }
}
