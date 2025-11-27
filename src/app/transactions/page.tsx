'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, FileText, SatelliteDish, User, CreditCard } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';

type Transaction = {
  id: string;
  transactionDate: string;
  amount: number;
  transactionType: string;
  notes?: string;
  subscriberName?: string;
  cardNumber?: string;
};

const getTransactionIcon = (type: string) => {
    switch (type) {
        case 'تجديد الوادي':
        case 'تجديد كرت':
            return <SatelliteDish className="h-6 w-6 text-blue-500" />;
        case 'تغذية رصيد':
            return <ArrowLeft className="h-6 w-6 text-green-500" />;
        case 'تحويل':
            return <ArrowRight className="h-6 w-6 text-red-500" />;
        default:
            return <SatelliteDish className="h-6 w-6 text-blue-500" />;
    }
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

  const transactionsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'transactions'),
            orderBy('transactionDate', 'desc')
          )
        : null,
    [user, firestore]
  );

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

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
      <Dialog>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <DialogTrigger key={tx.id} asChild onClick={() => setSelectedTx(tx)}>
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
                        <p className={`font-bold text-sm ${tx.transactionType === 'تغذية رصيد' ? 'text-green-600' : 'text-destructive'}`}>
                        {tx.transactionType !== 'تغذية رصيد' && '-'}
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
          ))}
        </div>
        
        {selectedTx && (
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
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ:</span>
                        <span className={`font-bold ${selectedTx.transactionType === 'تغذية رصيد' ? 'text-green-600' : 'text-destructive'}`}>
                             {selectedTx.transactionType !== 'تغذية رصيد' && '-'}
                             {selectedTx.amount.toLocaleString('en-US')} ريال
                        </span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">التاريخ:</span>
                        <span className="font-semibold text-right">
                           {format(parseISO(selectedTx.transactionDate), 'eeee, d MMMM yyyy', { locale: ar })}
                        </span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">الوقت:</span>
                        <span className="font-semibold">{format(parseISO(selectedTx.transactionDate), 'h:mm:ss a', { locale: ar })}</span>
                    </div>
                     {selectedTx.subscriberName && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4"/> اسم المشترك:</span>
                            <span className="font-semibold">{selectedTx.subscriberName}</span>
                        </div>
                     )}
                     {selectedTx.cardNumber && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4"/> رقم الكرت:</span>
                            <span className="font-semibold">{selectedTx.cardNumber}</span>
                        </div>
                     )}
                     {selectedTx.notes && (
                        <div className="flex flex-col text-right items-start space-y-2 pt-4 mt-2 border-t">
                            <span className="text-muted-foreground">الملاحظات:</span>
                            <p className="font-semibold bg-muted/50 p-2 rounded-md w-full">{selectedTx.notes}</p>
                        </div>
                     )}
                </div>
            </DialogContent>
        )}
      </Dialog>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="سجل العمليات" />
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
}
