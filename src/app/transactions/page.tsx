'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownToLine, ArrowUpFromLine, FileText, SatelliteDish, User as UserIcon, CreditCard, Trash2, Calendar, Clock, Archive, Undo2, Wifi, Building } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


type Transaction = {
  id: string;
  transactionDate: string;
  amount: number;
  transactionType: string;
  notes?: string;
  subscriberName?: string;
  cardNumber?: string;
  paymentMethodName?: string;
  recipientName?: string;
  accountNumber?: string;
};

const getTransactionIcon = (type: string) => {
    if (type.startsWith('استرجاع')) {
        return <Undo2 className="h-6 w-6 text-orange-500" />;
    }
    if (type.startsWith('تغذية') || type.startsWith('استلام') || type.startsWith('أرباح')) {
        return <ArrowDownToLine className="h-6 w-6 text-green-500" />;
    }
    if (type.startsWith('تحويل') || type.startsWith('سحب')) {
        return <ArrowUpFromLine className="h-6 w-6 text-destructive" />;
    }
    if (type.startsWith('شراء كرت')) {
        return <CreditCard className="h-6 w-6 text-primary" />;
    }
    if (type.startsWith('تجديد')) {
        return <SatelliteDish className="h-6 w-6 text-primary" />;
    }
    return <SatelliteDish className="h-6 w-6 text-primary" />;
};

// Simple hashing function to convert a string to a positive number string
const generateNumericId = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    // Take absolute value and slice to get a 6-digit number
    return Math.abs(hash).toString().slice(0, 6).padStart(6, '0');
};


export default function TransactionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);
  const { toast } = useToast();

  const transactionsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'transactions'),
            orderBy('transactionDate', 'desc')
          )
        : null,
    [user, firestore]
  );

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  const handleDeleteAll = () => {
    if (!firestore || !user || !transactions || transactions.length === 0) return;

    const batch = writeBatch(firestore);
    const userTransactionsPath = `users/${user.uid}/transactions`;

    transactions.forEach(transaction => {
      const docRef = doc(firestore, userTransactionsPath, transaction.id);
      batch.delete(docRef);
    });

    batch.commit()
      .then(() => {
        toast({
          title: 'نجاح',
          description: 'تمت أرشفة جميع العمليات بنجاح.'
        });
      })
      .catch((serverError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'delete',
          path: userTransactionsPath
        });
        errorEmitter.emit('permission-error', contextualError);
         toast({
          variant: "destructive",
          title: "خطأ",
          description: "فشلت عملية الأرشفة. قد لا تملك الصلاحيات الكافية.",
        });
      });
      
    setIsDeleteAllAlertOpen(false);
  };


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="text-left space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!transactions || transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">لا توجد عمليات</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            لم تقم بأي عمليات حتى الآن.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {transactions.map((tx) => (
            <Dialog key={tx.id} onOpenChange={(isOpen) => {
                if (isOpen) {
                    setSelectedTx(tx);
                    setIsDialogOpen(true);
                } else {
                    setSelectedTx(null);
                    setIsDialogOpen(false);
                }
            }}>
                <DialogTrigger asChild>
                    <Card className="overflow-hidden animate-in fade-in-0 cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-full">
                                {getTransactionIcon(tx.transactionType)}
                            </div>
                            <div>
                            <p className="font-semibold text-sm">{tx.transactionType}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(tx.transactionDate), 'd MMMM yyyy, h:mm a', { locale: ar })}
                            </p>
                            </div>
                        </div>
                        <div className="text-left">
                            <p className={`font-bold text-sm ${tx.transactionType.startsWith('تغذية') || tx.transactionType.startsWith('استلام') || tx.transactionType.startsWith('أرباح') || tx.transactionType.startsWith('استرجاع') ? 'text-green-600' : 'text-destructive'}`}>
                              {tx.amount.toLocaleString('en-US')} ريال
                            </p>
                            {tx.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={tx.notes}>
                                    {tx.notes}
                                </p>
                            )}
                        </div>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                {isDialogOpen && selectedTx && selectedTx.id === tx.id && (
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>تفاصيل العملية</DialogTitle>
                        <DialogDescription>
                            تفاصيل العملية رقم: {generateNumericId(selectedTx.id)}
                        </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">الباقة:</span>
                                <span className="font-semibold">{selectedTx.transactionType}</span>
                            </div>
                            {selectedTx.notes && selectedTx.transactionType.startsWith('شراء كرت') && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center gap-2"><Wifi className="h-4 w-4"/> الشبكة:</span>
                                    <span className="font-semibold">{selectedTx.notes}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">المبلغ:</span>
                                <span className={`font-bold ${selectedTx.transactionType.startsWith('تغذية') || selectedTx.transactionType.startsWith('استلام') || selectedTx.transactionType.startsWith('أرباح') || selectedTx.transactionType.startsWith('استرجاع') ? 'text-green-600' : 'text-destructive'}`}>
                                    {selectedTx.amount.toLocaleString('en-US')} ريال
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4"/> التاريخ:</span>
                                <span className="font-semibold text-right">
                                {format(parseISO(selectedTx.transactionDate), 'eeee, d MMMM yyyy', { locale: ar })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> الوقت:</span>
                                <span className="font-semibold">{format(parseISO(selectedTx.transactionDate), 'h:mm:ss a', { locale: ar })}</span>
                            </div>
                             {selectedTx.subscriberName && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center gap-2"><UserIcon className="h-4 w-4"/> اسم المشترك:</span>
                                    <span className="font-semibold">{selectedTx.subscriberName}</span>
                                </div>
                            )}
                            {selectedTx.cardNumber && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4"/> رقم الكرت:</span>
                                    <span className="font-semibold">{selectedTx.cardNumber}</span>
                                </div>
                            )}
                             {selectedTx.transactionType === 'سحب أرباح' && (
                                <>
                                    <div className="pt-4 mt-2 border-t">
                                        <h4 className="font-bold text-base mb-2">تفاصيل السحب</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><Building className="h-4 w-4"/> البنك:</span>
                                                <span className="font-semibold">{selectedTx.paymentMethodName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><UserIcon className="h-4 w-4"/> اسم المستلم:</span>
                                                <span className="font-semibold">{selectedTx.recipientName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4"/> رقم الحساب:</span>
                                                <span className="font-semibold">{selectedTx.accountNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline" className="w-full">إغلاق</Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="سجل العمليات" />
        <div className="flex-1 overflow-y-auto p-4">
             {transactions && transactions.length > 0 && (
                <AlertDialog open={isDeleteAllAlertOpen} onOpenChange={setIsDeleteAllAlertOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full mb-4">
                            <Archive className="ml-2 h-4 w-4" />
                            أرشفة جميع العمليات
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>تأكيد الأرشفة</AlertDialogTitle>
                            <AlertDialogDescription>
                                هل أنت متأكد من رغبتك في أرشفة جميع العمليات؟ سيتم حذفها نهائياً من سجلك.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">
                                حذف الكل
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
          {renderContent()}
        </div>
      </div>
      <Toaster />
    </>
  );
}