'use client';

import React, { useState, useMemo } from 'react';
import { doc, updateDoc, writeBatch, collection, increment } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Banknote, Calendar, Check, X, MessageCircle, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

type ManualDepositRequest = {
  id: string;
  userId: string;
  userName: string;
  userPhoneNumber: string;
  amount: number;
  receiptImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
  notes?: string;
};

const StatusBadge = ({ status }: { status: ManualDepositRequest['status'] }) => {
  const statusStyles = {
    pending: 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30',
    approved: 'bg-green-400/20 text-green-600 border-green-400/30',
    rejected: 'bg-red-400/20 text-red-600 border-red-400/30',
  };
  const statusText = {
    pending: 'قيد الانتظار',
    approved: 'مقبول',
    rejected: 'مرفوض',
  };

  return <Badge className={statusStyles[status]}>{statusText[status]}</Badge>;
};

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
    <div className="flex justify-between items-center py-3 border-b">
        <span className="text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
        <span className="font-semibold">{typeof value === 'number' ? `${value.toLocaleString('en-US')} ريال` : value}</span>
    </div>
);

export default function DepositRequestDetailsPage({ params }: { params: { requestId: string } }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { requestId } = params;

  const [actionToConfirm, setActionToConfirm] = useState<'approve' | 'reject' | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const requestDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'manualDepositRequests', requestId) : null), [firestore, requestId]);
  const { data: request, isLoading } = useDoc<ManualDepositRequest>(requestDocRef);

  const handleAction = async () => {
    if (!request || !actionToConfirm || !firestore || !requestDocRef) return;

    const userDocRef = doc(firestore, 'users', request.userId);
    const userNotificationsRef = collection(firestore, 'users', request.userId, 'notifications');
    const userTransactionsRef = collection(firestore, 'users', request.userId, 'transactions');
    
    try {
      const batch = writeBatch(firestore);

      if (actionToConfirm === 'approve') {
        // Update user balance
        batch.update(userDocRef, { balance: increment(request.amount) });
        
        // Add transaction record
        const transactionRef = doc(userTransactionsRef);
        batch.set(transactionRef, {
            userId: request.userId,
            transactionDate: new Date().toISOString(),
            amount: request.amount,
            transactionType: 'إيداع يدوي',
            notes: `قبول طلب إيداع يدوي`,
        });

        // Add notification
        const notificationRef = doc(userNotificationsRef);
        batch.set(notificationRef, {
            title: 'تم قبول طلب الإيداع',
            body: `تمت إضافة مبلغ ${request.amount.toLocaleString('en-US')} ريال إلى رصيدك.`,
            timestamp: new Date().toISOString()
        });

      } else { // 'reject'
        const notificationRef = doc(userNotificationsRef);
        batch.set(notificationRef, {
            title: 'تم رفض طلب الإيداع',
            body: `تم رفض طلب إيداع مبلغ ${request.amount.toLocaleString('en-US')} ريال. السبب: ${rejectionNote || 'لا يوجد سبب محدد.'}`,
            timestamp: new Date().toISOString()
        });
      }

      // Update request status
      batch.update(requestDocRef, { status: actionToConfirm, notes: rejectionNote || null });

      await batch.commit();

      toast({
        title: "نجاح",
        description: `تم ${actionToConfirm === 'approve' ? 'قبول' : 'رفض'} الطلب بنجاح.`,
      });
      router.push('/manual-deposits');

    } catch (error) {
      console.error("Error processing request: ", error);
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ أثناء معالجة الطلب.",
      });
    } finally {
      setActionToConfirm(null);
      setRejectionNote('');
    }
  };

  const renderContent = () => {
    if (isLoading || !request) {
      return (
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      );
    }

    return (
      <div className='space-y-4'>
        <Card>
            <CardHeader>
                <CardTitle className='text-center'>صورة الإيصال</CardTitle>
            </CardHeader>
            <CardContent>
                <a href={request.receiptImageUrl} target="_blank" rel="noopener noreferrer">
                    <Image
                        src={request.receiptImageUrl}
                        alt="إيصال التحويل"
                        width={500}
                        height={500}
                        className="rounded-lg w-full h-auto object-contain border"
                    />
                </a>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>تفاصيل الطلب</CardTitle>
            <StatusBadge status={request.status} />
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow icon={User} label="اسم المستخدم" value={request.userName} />
            <InfoRow icon={Phone} label="رقم الهاتف" value={request.userPhoneNumber} />
            <InfoRow icon={Banknote} label="المبلغ" value={request.amount} />
            <InfoRow icon={Calendar} label="تاريخ الطلب" value={format(parseISO(request.requestTimestamp), 'Pp', { locale: ar })} />
             {request.notes && (
                <div className="pt-2 text-sm">
                    <p className="text-muted-foreground font-semibold">ملاحظات:</p>
                    <p>{request.notes}</p>
                </div>
            )}
          </CardContent>
        </Card>

        {request.status === 'pending' && (
             <div className='grid grid-cols-2 gap-3'>
                <Button variant="destructive" onClick={() => setActionToConfirm('reject')}><X className="ml-2"/> رفض</Button>
                <Button onClick={() => setActionToConfirm('approve')}><Check className="ml-2"/> قبول</Button>
            </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="تفاصيل طلب الإيداع" />
        <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
      </div>
      <Toaster />

      <AlertDialog open={!!actionToConfirm} onOpenChange={(open) => !open && setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              {actionToConfirm === 'approve'
                ? `سيتم قبول الطلب وإضافة مبلغ ${request?.amount.toLocaleString('en-US')} ريال إلى رصيد المستخدم.`
                : 'سيتم رفض هذا الطلب. يمكنك إضافة سبب للرفض.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionToConfirm === 'reject' && (
             <div className="grid w-full gap-1.5 pt-2">
                <Label htmlFor="rejection-note" className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" /> سبب الرفض (اختياري)</Label>
                <Textarea 
                    placeholder="اكتب سبب رفض الطلب هنا..." 
                    id="rejection-note" 
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
