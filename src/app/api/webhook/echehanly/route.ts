import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, writeBatch, doc, increment } from 'firebase/firestore';
import { initializeServerFirebase } from '@/firebase/server-init';

const ECHENTELLY_BACKPASS = process.env.ECHENTELLY_BACKPASS;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const backpass = searchParams.get('backpass');
    const transid = searchParams.get('transid');
    const message = searchParams.get('message');

    // 1. Security Check
    if (!ECHENTELLY_BACKPASS || backpass !== ECHENTELLY_BACKPASS) {
        return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    // 2. Parameter Validation
    if (!action || !transid) {
        return new NextResponse(JSON.stringify({ message: 'Missing required parameters: action and transid' }), { status: 400 });
    }
    
    try {
        const { firestore } = initializeServerFirebase();
        const requestsRef = collection(firestore, 'billPaymentRequests');
        const q = query(requestsRef, where('transid', '==', transid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`Webhook received for unknown transid: ${transid}`);
            return new NextResponse(JSON.stringify({ message: 'Transaction not found' }), { status: 404 });
        }

        const requestDoc = querySnapshot.docs[0];
        const requestData = requestDoc.data();

        // Avoid processing already rejected or already handled webhooks
        if (requestData.status === 'rejected') {
             return new NextResponse(JSON.stringify({ message: 'Transaction already rejected' }), { status: 200 });
        }

        const batch = writeBatch(firestore);

        if (action === 'done') {
            // The request was successful, we just ensure its status is 'approved'.
            // In our current flow, it's already approved optimistically.
            // We can add a flag like `webhookConfirmed: true` if needed.
            batch.update(requestDoc.ref, { status: 'approved' });

        } else if (action === 'ban') {
            // The operation failed. We need to refund the user.
            const userDocRef = doc(firestore, 'users', requestData.userId);

            // 1. Refund the user's balance
            batch.update(userDocRef, {
                balance: increment(requestData.totalCost)
            });
            
            // 2. Mark the request as rejected
            batch.update(requestDoc.ref, { status: 'rejected' });

            // 3. Create a refund transaction for the user
            const userTransactionsRef = collection(firestore, 'users', requestData.userId, 'transactions');
            const refundTransactionRef = doc(userTransactionsRef);
            batch.set(refundTransactionRef, {
                userId: requestData.userId,
                transactionDate: new Date().toISOString(),
                amount: requestData.totalCost,
                transactionType: 'استرجاع مبلغ مرفوض',
                notes: `فشل عملية سداد "${requestData.company}". السبب: ${message || 'رفض من مزود الخدمة'}`,
            });
            
            // 4. (Optional but good) Send a notification to the user
            const userNotificationsRef = collection(firestore, 'users', requestData.userId, 'notifications');
            const notificationRef = doc(userNotificationsRef);
            batch.set(notificationRef, {
                 title: 'فشل عملية سداد',
                 body: `فشلت عملية سداد لـ ${requestData.company}. تم إرجاع مبلغ ${requestData.totalCost} ريال إلى حسابك.`,
                 timestamp: new Date().toISOString(),
            });
        }
        
        await batch.commit();

        return new NextResponse(JSON.stringify({ message: 'Webhook processed successfully' }), { status: 200 });

    } catch (error) {
        console.error("Webhook processing error:", error);
        return new NextResponse(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
    }
}
