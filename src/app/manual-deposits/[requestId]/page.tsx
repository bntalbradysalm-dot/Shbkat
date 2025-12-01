'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, increment, addDoc, collection, writeBatch } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User, Phone, Check, X, Calendar, Wallet } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

type ManualDepositRequest = {
  id: string;
  userId: string;
  userName: string;
  userPhoneNumber: string;
  amount: number;
  receiptImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
};

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
  <div className="flex justify-between items-center py-3 border-b last:border-b-0">
    <span className="text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" /> {label}:</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default function DepositRequestDetailsPage({ params }: { params: { requestId: string } }) {
  const { requestId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [actionToConfirm, setActionToConfirm] = useState<'approve' | 'reject' | null>(null);

  const requestDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'manualDepositRequests', requestId) : null),
    [firestore, requestId]
  );
  const { data: request, isLoading } = useDoc<ManualDepositRequest>(requestDocRef);

  const handleAction = async () => {
    if (!request || !actionToConfirm || !firestore) return;

    const requestRef = doc(firestore, 'manualDepositRequests', request.id);
    const userRef = doc(firestore, 'users', request.userId);
    const batch = writeBatch(firestore);

    if (actionToConfirm === 'approve') {
      batch.update(userRef, { balance: increment(request.amount) });
      const transactionRef = doc(collection(firestore, `users/${request.userId}/transactions`));
      batch.set(transactionRef, {
        amount: request.amount,
        transactionDate: new Date().toISOString(),
        transactionType: 'تغذية رصيد (يدوي)',
        notes: `قبول طلب إيداع رقم: ${request.id}`,
        userId: request.userId,
      });
    }

    batch.update(requestRef, { status: actionToConfirm });

    try {
      await batch.commit();
      toast({ title: 'نجاح', description: `تم ${actionToConfirm === 'approve' ? 'قبول' : 'رفض'} الطلب بنجاح.` });
      router.push('/manual-deposits');
    } catch (error) {
      console.error('Error processing request:', error);
      toast({ variant: 'destructive', title: 'خطأ', description: 'فشلت معالجة الطلب.' });
    } finally {
      setActionToConfirm(null);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      );
    }

    if (!request) {
      return <p className="text-center text-muted-foreground mt-10">لم يتم العثور على الطلب.</p>;
    }

    return (
      <div className="p-4 space-y-6">
        <Card>
          <CardContent className="p-4">
            <InfoRow icon={User} label="اسم المستخدم" value={request.userName} />
            <InfoRow icon={Phone} label="رقم الهاتف" value={request.userPhoneNumber} />
            <InfoRow icon={Calendar} label="تاريخ الطلب" value={format(parseISO(request.requestTimestamp), 'Pp', { locale: ar })} />
            <InfoRow icon={Wallet} label="المبلغ المطلوب" value={<span className="font-bold text-lg text-primary">{request.amount.toLocaleString('en-US')} ريال</span>} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2">
            <a href={request.receiptImageUrl} target="_blank" rel="noopener noreferrer">
              <Image
                src={request.receiptImageUrl}
                alt="إيصال الدفع"
                width={500}
                height={500}
                className="rounded-lg object-contain w-full"
              />
            </a>
          </CardContent>
        </Card>

        {request.status === 'pending' && (
          <div className="grid grid-cols-2 gap-4">
            <Button variant="destructive" onClick={() => setActionToConfirm('reject')}><X className="ml-2" /> رفض</Button>
            <Button onClick={() => setActionToConfirm('approve')}><Check className="ml-2" /> قبول</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="تفاصيل طلب الإيداع" />
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>
      <Toaster />

      <AlertDialog open={!!actionToConfirm} onOpenChange={(open) => !open && setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              {actionToConfirm === 'approve'
                ? `سيتم إضافة مبلغ ${request?.amount.toLocaleString('en-US')} ريال إلى رصيد المستخدم.`
                : 'سيتم رفض هذا الطلب ولن يتم تحديث رصيد المستخدم. لا يمكن التراجع عن هذا الإجراء.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    