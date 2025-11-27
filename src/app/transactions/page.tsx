'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, DollarSign, FileText, SatelliteDish } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

type Transaction = {
  id: string;
  transactionDate: string;
  amount: number;
  transactionType: string;
  notes?: string;
};

const getTransactionIcon = (type: string) => {
    switch (type) {
        case 'تجديد الوادي':
            return <SatelliteDish className="h-6 w-6 text-blue-500" />;
        case 'تغذية رصيد':
            return <ArrowLeft className="h-6 w-6 text-green-500" />;
        case 'تحويل':
            return <ArrowRight className="h-6 w-6 text-red-500" />;
        default:
            return <FileText className="h-6 w-6 text-gray-500" />;
    }
};


export default function TransactionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

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
      <div className="space-y-3">
        {transactions.map((tx) => (
          <Card key={tx.id} className="overflow-hidden animate-in fade-in-0">
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
        ))}
      </div>
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
