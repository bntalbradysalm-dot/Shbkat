'use client';

import React, { useState } from 'react';
import { collection, doc, updateDoc, increment, query, orderBy, addDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
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
import { User, Tag, Phone, CreditCard, Calendar, Check, X, Circle } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

type RenewalRequest = {
  id: string;
  userId: string;
  userName: string;
  userPhoneNumber: string;
  packageTitle: string;
  packagePrice: number;
  subscriberName: string;
  cardNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
};

const StatusBadge = ({ status }: { status: RenewalRequest['status'] }) => {
  const statusStyles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
  };
  const statusText = {
    pending: 'قيد الانتظار',
    approved: 'مقبول',
    rejected: 'مرفوض',
  };

  return <Badge className={statusStyles[status]}>{statusText[status]}</Badge>;
};

export default function RenewalRequestsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<RenewalRequest | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<'approve' | 'reject' | null>(null);

  const requestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'renewalRequests'), orderBy('requestTimestamp', 'desc')) : null),
    [firestore]
  );
  const { data: requests, isLoading } = useCollection<RenewalRequest>(requestsQuery);

  const handleAction = async () => {
    if (!selectedRequest || !actionToConfirm || !firestore) return;

    const requestDocRef = doc(firestore, 'renewalRequests', selectedRequest.id);
    const userDocRef = doc(firestore, 'users', selectedRequest.userId);
    
    try {
        if (actionToConfirm === 'approve') {
            // Balance was already deducted. Just record the transaction.
            const transactionData = {
                userId: selectedRequest.userId,
                transactionDate: new Date().toISOString(),
                amount: selectedRequest.packagePrice,
                transactionType: 'تجديد الوادي',
                notes: `تجديد باقة "${selectedRequest.packageTitle}" للمشترك ${selectedRequest.subscriberName} (كرت: ${selectedRequest.cardNumber})`,
              };
            await addDoc(collection(firestore, 'users', selectedRequest.userId, 'transactions'), transactionData);
        } else {
            // Action is 'reject'. Refund the user.
            await updateDoc(userDocRef, {
                balance: increment(selectedRequest.packagePrice)
            });
        }

        // Update request status for both approve and reject
        await updateDoc(requestDocRef, { status: actionToConfirm === 'approve' ? 'approved' : 'rejected' });

        toast({
            title: "نجاح",
            description: `تم ${actionToConfirm === 'approve' ? 'قبول' : 'رفض'} الطلب بنجاح.`,
        });

    } catch (error: any) {
        console.error("Error processing request: ", error);
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "حدث خطأ أثناء معالجة الطلب.",
        });
    } finally {
        setActionToConfirm(null);
        setSelectedRequest(null);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      );
    }
    if (!requests || requests.length === 0) {
      return <p className="text-center text-muted-foreground mt-10">لا توجد طلبات تجديد حاليًا.</p>;
    }
    return (
      <Dialog onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <div className="space-y-3">
          {requests.map((request) => (
            <DialogTrigger asChild key={request.id} onClick={() => setSelectedRequest(request)}>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="font-bold">{request.userName}</p>
                        <p className="text-sm text-muted-foreground">{request.packageTitle}</p>
                    </div>
                    </div>
                    <div className="text-left flex flex-col items-end gap-1">
                        <StatusBadge status={request.status} />
                        <span className="text-xs text-muted-foreground">
                            {format(parseISO(request.requestTimestamp), 'P', { locale: ar })}
                        </span>
                    </div>
                </CardContent>
                </Card>
            </DialogTrigger>
          ))}
        </div>
        {selectedRequest && (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تفاصيل طلب التجديد</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 text-sm">
                    <InfoRow icon={User} label="اسم المستخدم" value={selectedRequest.userName} />
                    <InfoRow icon={Phone} label="رقم الهاتف" value={selectedRequest.userPhoneNumber} />
                    <InfoRow icon={Tag} label="الباقة المطلوبة" value={selectedRequest.packageTitle} />
                    <InfoRow icon={User} label="اسم المشترك" value={selectedRequest.subscriberName} />
                    <InfoRow icon={CreditCard} label="رقم الكرت" value={selectedRequest.cardNumber} />
                    <InfoRow icon={Calendar} label="تاريخ الطلب" value={format(parseISO(selectedRequest.requestTimestamp), 'Pp', { locale: ar })} />
                    <div className="flex justify-between items-center pt-2 border-t mt-3">
                        <span className="text-muted-foreground font-semibold">المبلغ:</span>
                        <span className="font-bold text-lg text-primary">{selectedRequest.packagePrice.toLocaleString('en-US')} ريال</span>
                    </div>
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2">
                    {selectedRequest.status === 'pending' && (
                    <>
                        <Button variant="destructive" onClick={() => setActionToConfirm('reject')}><X className="ml-2"/> رفض</Button>
                        <Button onClick={() => setActionToConfirm('approve')}><Check className="ml-2"/> قبول</Button>
                    </>
                    )}
                     {selectedRequest.status !== 'pending' && (
                         <DialogClose asChild>
                            <Button variant="outline" className="col-span-2">إغلاق</Button>
                         </DialogClose>
                     )}
                </DialogFooter>
            </DialogContent>
        )}
      </Dialog>
    );
  };
  
  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => (
    <div className="flex justify-between items-center">
        <span className="text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" /> {label}:</span>
        <span className="font-semibold">{value}</span>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="طلبات التجديد" />
        <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
      </div>
      <Toaster />

      <AlertDialog open={!!actionToConfirm} onOpenChange={(open) => !open && setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              {actionToConfirm === 'approve'
                ? `سيتم تأكيد العملية وتسجيلها في سجل عمليات المستخدم.`
                : 'سيتم رفض هذا الطلب وإرجاع المبلغ للعميل. لا يمكن التراجع عن هذا الإجراء.'}
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
