'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, updateDoc, increment, query, orderBy, addDoc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
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
import { User, Phone, Calendar, Check, X, Archive, Inbox, Trash2, Repeat, Wallet } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type TransferRequest = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhone: string;
  toUserId: string;
  toUserName: string;
  toUserPhone: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
};

const StatusBadge = ({ status }: { status: TransferRequest['status'] }) => {
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

export default function TransferRequestsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<'approve' | 'reject' | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const requestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'transferRequests'), orderBy('requestTimestamp', 'desc')) : null),
    [firestore]
  );
  const { data: requests, isLoading } = useCollection<TransferRequest>(requestsQuery);

  const { pendingRequests, archivedRequests } = useMemo(() => {
    const pending: TransferRequest[] = [];
    const archived: TransferRequest[] = [];
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

    const requestDocRef = doc(firestore, 'transferRequests', selectedRequest.id);
    
    try {
        if (finalAction === 'approve') {
            const batch = writeBatch(firestore);
            
            // Balance already deducted from sender, so just add to receiver
            const toUserRef = doc(firestore, 'users', selectedRequest.toUserId);
            batch.update(toUserRef, { balance: increment(selectedRequest.amount) });

            const now = new Date().toISOString();

            // Create transaction record for sender (already deducted)
            const fromTransactionRef = doc(collection(firestore, 'users', selectedRequest.fromUserId, 'transactions'));
            batch.set(fromTransactionRef, {
                userId: selectedRequest.fromUserId,
                transactionDate: now,
                amount: selectedRequest.amount,
                transactionType: `تحويل إلى ${selectedRequest.toUserName}`,
                notes: `إلى رقم: ${selectedRequest.toUserPhone}`
            });

            // Create transaction record for receiver
            const toTransactionRef = doc(collection(firestore, 'users', selectedRequest.toUserId, 'transactions'));
            batch.set(toTransactionRef, {
                userId: selectedRequest.toUserId,
                transactionDate: now,
                amount: selectedRequest.amount,
                transactionType: `استلام من ${selectedRequest.fromUserName}`,
                notes: `من رقم: ${selectedRequest.fromUserPhone}`
            });
            
            // Update request status
            batch.update(requestDocRef, { status: 'approved' });

            await batch.commit();
            
            toast({
                title: "نجاح",
                description: "تم قبول الطلب وتنفيذ التحويل بنجاح."
            });

        } else { // 'reject'
            // Refund the sender
            const fromUserRef = doc(firestore, 'users', selectedRequest.fromUserId);
            await updateDoc(fromUserRef, { balance: increment(selectedRequest.amount) });
            
            // Update request status
            await updateDoc(requestDocRef, { status: 'rejected' });
            
            toast({
                title: "تم الرفض",
                description: "تم رفض الطلب وإرجاع المبلغ للمرسل."
            });
        }
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

  const handleDelete = () => {
    if (!selectedRequest || !firestore) return;
    const requestDocRef = doc(firestore, 'transferRequests', selectedRequest.id);
    deleteDocumentNonBlocking(requestDocRef);
    toast({
        title: "تم الحذف",
        description: "تم حذف الطلب من الأرشيف بنجاح."
    });
    setIsDeleteAlertOpen(false);
    setSelectedRequest(null);
    setIsDialogOpen(false);
  }

  const handleDeleteAllArchived = () => {
    if (!firestore || !archivedRequests || archivedRequests.length === 0) return;
    
    const batch = writeBatch(firestore);
    archivedRequests.forEach(request => {
      const docRef = doc(firestore, 'transferRequests', request.id);
      batch.delete(docRef);
    });

    batch.commit()
      .then(() => {
        toast({
          title: 'نجاح',
          description: 'تم حذف جميع الطلبات المؤرشفة بنجاح.'
        });
      })
      .catch((serverError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'delete',
          path: '/transferRequests'
        });
        errorEmitter.emit('permission-error', contextualError);
      });

    setIsDeleteAllAlertOpen(false);
  };

  const RequestList = ({ list, emptyMessage }: { list: TransferRequest[], emptyMessage: string }) => {
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
                      <Repeat className="h-6 w-6 text-primary dark:text-primary-foreground" />
                  </div>
                  <div>
                      <p className="font-bold">{request.fromUserName}</p>
                      <p className="text-sm text-muted-foreground">إلى: {request.toUserName}</p>
                  </div>
                  </div>
                  <div className="text-left flex flex-col items-end gap-1">
                      <p className="font-bold text-destructive">{request.amount.toLocaleString('en-US')} ريال</p>
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
               <RequestList list={pendingRequests} emptyMessage="لا توجد طلبات تحويل حاليًا."/>
            </TabsContent>
            <TabsContent value="archived" className="p-4 space-y-4">
                {archivedRequests.length > 0 && (
                    <Button variant="destructive" className="w-full" onClick={() => setIsDeleteAllAlertOpen(true)}>
                        <Trash2 className="ml-2 h-4 w-4" />
                        حذف كل الأرشيف
                    </Button>
                )}
                <RequestList list={archivedRequests} emptyMessage="لا توجد طلبات مؤرشفة."/>
            </TabsContent>
        </Tabs>
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
        <SimpleHeader title="طلبات التحويل" />
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
      <Toaster />

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) setSelectedRequest(null);
        setIsDialogOpen(open);
      }}>
         {selectedRequest && (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تفاصيل طلب التحويل</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3 text-sm">
                    <p className='font-bold text-base'>المرسل</p>
                    <InfoRow icon={User} label="اسم المرسل" value={selectedRequest.fromUserName} />
                    <InfoRow icon={Phone} label="رقم المرسل" value={selectedRequest.fromUserPhone} />
                    <hr className='my-4' />
                    <p className='font-bold text-base'>المستلم</p>
                    <InfoRow icon={User} label="اسم المستلم" value={selectedRequest.toUserName} />
                    <InfoRow icon={Phone} label="رقم المستلم" value={selectedRequest.toUserPhone} />
                    <hr className='my-4' />
                    <InfoRow icon={Calendar} label="تاريخ الطلب" value={format(parseISO(selectedRequest.requestTimestamp), 'Pp', { locale: ar })} />
                    <div className="flex justify-between items-center pt-2 border-t mt-3">
                        <span className="text-muted-foreground font-semibold flex items-center gap-2"><Wallet className="h-4 w-4"/>المبلغ:</span>
                        <span className="font-bold text-lg text-primary dark:text-primary-foreground">{selectedRequest.amount.toLocaleString('en-US')} ريال</span>
                    </div>
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2">
                    {selectedRequest.status === 'pending' && (
                    <>
                        <Button variant="destructive" onClick={() => setActionToConfirm('reject')}><X className="ml-2"/> رفض</Button>
                        <Button onClick={() => handleAction('approve')}><Check className="ml-2"/> قبول</Button>
                    </>
                    )}
                     {selectedRequest.status !== 'pending' && (
                         <>
                            <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} className="col-span-1">
                                <Trash2 className="ml-2 h-4 w-4"/>
                                حذف
                            </Button>
                            <DialogClose asChild>
                                <Button variant="outline" className="col-span-1">إغلاق</Button>
                            </DialogClose>
                         </>
                     )}
                </DialogFooter>
            </DialogContent>
        )}
      </Dialog>

      <AlertDialog open={!!actionToConfirm} onOpenChange={(open) => !open && setActionToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              {actionToConfirm === 'approve'
                ? `سيتم إضافة المبلغ إلى المستلم. تم خصم المبلغ من المرسل مسبقاً.`
                : 'سيتم رفض هذا الطلب وإرجاع المبلغ إلى المرسل.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleAction()}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا الطلب من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAllAlertOpen} onOpenChange={setIsDeleteAllAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف الجماعي</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من رغبتك في حذف جميع الطلبات المؤرشفة؟ سيتم حذف {archivedRequests.length} طلبات نهائيًا ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllArchived} className="bg-destructive hover:bg-destructive/90">حذف الكل</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
