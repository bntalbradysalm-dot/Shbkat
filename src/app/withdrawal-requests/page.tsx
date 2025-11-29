'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, query, orderBy, updateDoc, increment, addDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { User, Phone, Check, X, Archive, Inbox, Banknote, Building, Image as ImageIcon } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

type WithdrawalRequest = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoneNumber: string;
  amount: number;
  paymentMethodName: string;
  paymentMethodLogo?: string;
  recipientName: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
};

const StatusBadge = ({ status }: { status: WithdrawalRequest['status'] }) => {
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

const getLogoSrc = (url?: string) => {
    if (url && (url.startsWith('http') || url.startsWith('/'))) {
      return url;
    }
    return 'https://placehold.co/100x100/e2e8f0/e2e8f0'; 
};

export default function WithdrawalRequestsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<'approve' | 'reject' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const requestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'withdrawalRequests'), orderBy('requestTimestamp', 'desc')) : null),
    [firestore]
  );
  const { data: requests, isLoading } = useCollection<WithdrawalRequest>(requestsQuery);

  const { pendingRequests, archivedRequests } = useMemo(() => {
    const pending: WithdrawalRequest[] = [];
    const archived: WithdrawalRequest[] = [];
    requests?.forEach(req => {
      if (req.status === 'pending') {
        pending.push(req);
      } else {
        archived.push(req);
      }
    });
    return { pendingRequests: pending, archivedRequests: archived };
  }, [requests]);

  const handleAction = async (actionType?: 'approve' | 'reject') => {
    const finalAction = actionType || actionToConfirm;
    if (!selectedRequest || !finalAction || !firestore) return;

    const requestDocRef = doc(firestore, 'withdrawalRequests', selectedRequest.id);
    
    try {
      if (finalAction === 'approve') {
        // Balance was already deducted. Just add a transaction log.
        const ownerTransactionsRef = collection(firestore, 'users', selectedRequest.ownerId, 'transactions');
        await addDoc(ownerTransactionsRef, {
            userId: selectedRequest.ownerId,
            transactionDate: new Date().toISOString(),
            amount: selectedRequest.amount,
            transactionType: 'سحب أرباح',
            notes: `إلى حساب: ${selectedRequest.recipientName} (${selectedRequest.paymentMethodName})`,
        });
      } else { // 'reject'
        // Refund the user's balance because it was deducted on request.
        const ownerDocRef = doc(firestore, 'users', selectedRequest.ownerId);
        await updateDoc(ownerDocRef, {
            balance: increment(selectedRequest.amount)
        });
      }

      // Update request status for both approve and reject
      await updateDoc(requestDocRef, { status: finalAction === 'approve' ? 'approved' : 'rejected' });

      toast({
        title: "نجاح",
        description: `تم ${finalAction === 'approve' ? 'قبول' : 'رفض'} طلب السحب بنجاح.`,
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
      setIsDialogOpen(false);
    }
  };
  
  const RequestList = ({ list, emptyMessage }: { list: WithdrawalRequest[], emptyMessage: string }) => {
    if (!list || list.length === 0) {
      return <p className="text-center text-muted-foreground mt-10">{emptyMessage}</p>;
    }
    return (
        <div className="space-y-3">
          {list.map((request) => (
            <div
              key={request.id}
              onClick={() => {
                setSelectedRequest(request);
                setIsDialogOpen(true);
              }}
              className="cursor-pointer"
            >
              <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                      <p className="font-bold">{request.ownerName}</p>
                      <p className="text-sm text-muted-foreground">{request.paymentMethodName}</p>
                  </div>
                  </div>
                  <div className="text-left flex flex-col items-end gap-1">
                      <p className="font-bold text-lg text-primary">{request.amount.toLocaleString('en-US')} ريال</p>
                      <StatusBadge status={request.status} />
                  </div>
              </CardContent>
              </Card>
            </div>
          ))}
        </div>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      );
    }
    return (
        <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">
                   <Inbox className="ml-2 h-4 w-4"/>
                   الطلبات الحالية ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="archived">
                    <Archive className="ml-2 h-4 w-4"/>
                    الأرشيف ({archivedRequests.length})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="p-4">
               <RequestList list={pendingRequests} emptyMessage="لا توجد طلبات سحب حاليًا."/>
            </TabsContent>
            <TabsContent value="archived" className="p-4">
                <RequestList list={archivedRequests} emptyMessage="لا توجد طلبات مؤرشفة."/>
            </TabsContent>
        </Tabs>
    );
  };
  
  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | React.ReactNode }) => (
    <div className="flex justify-between items-center py-2 border-b last:border-b-0">
        <span className="text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" /> {label}:</span>
        <span className="font-semibold">{value}</span>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="طلبات السحب" />
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
      <Toaster />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) { setSelectedRequest(null); }
        setIsDialogOpen(open);
      }}>
         {selectedRequest && (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تفاصيل طلب السحب</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2 text-sm">
                    <InfoRow icon={User} label="اسم مالك الشبكة" value={selectedRequest.ownerName} />
                    <InfoRow icon={Phone} label="رقم الهاتف" value={selectedRequest.ownerPhoneNumber} />
                    <InfoRow icon={Banknote} label="المبلغ المطلوب" value={<span className='text-primary font-bold'>{selectedRequest.amount.toLocaleString('en-US')} ريال</span>} />
                    <hr className="my-2"/>
                    <InfoRow icon={ImageIcon} label="طريقة الاستلام" value={
                        <div className="flex items-center gap-2">
                             <Image src={getLogoSrc(selectedRequest.paymentMethodLogo)} alt={selectedRequest.paymentMethodName} width={20} height={20} className="rounded-md" />
                             {selectedRequest.paymentMethodName}
                        </div>
                    } />
                    <InfoRow icon={User} label="اسم المستلم" value={selectedRequest.recipientName} />
                    <InfoRow icon={Building} label="رقم الحساب" value={selectedRequest.accountNumber} />
                </div>
                {selectedRequest.status === 'pending' && (
                    <DialogFooter className="grid grid-cols-2 gap-2">
                        <Button variant="destructive" onClick={() => setActionToConfirm('reject')}><X className="ml-2"/> رفض الطلب</Button>
                        <Button onClick={() => setActionToConfirm('approve')}><Check className="ml-2"/> قبول الطلب</Button>
                    </DialogFooter>
                )}
                 {selectedRequest.status !== 'pending' && (
                     <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full">إغلاق</Button>
                        </DialogClose>
                     </DialogFooter>
                 )}
            </DialogContent>
        )}
      </Dialog>

      <AlertDialog open={!!actionToConfirm} onOpenChange={(open) => !open && setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              {actionToConfirm === 'approve'
                ? `سيتم تأكيد الطلب كمقبول وتسجيل عملية السحب في سجل المالك.`
                : 'سيتم رفض هذا الطلب وإعادة المبلغ إلى رصيد المالك. لا يمكن التراجع عن هذا الإجراء.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction()}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
