'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownToLine, ArrowUpFromLine, FileText, SatelliteDish, ChevronLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';

type Transaction = {
  id: string;
  transactionDate: string;
  amount: number;
  transactionType: string;
};

const getTransactionIcon = (type: string) => {
    if (type.startsWith('تغذية') || type.startsWith('استلام') || type.startsWith('أرباح')) {
        return <ArrowDownToLine className="h-5 w-5 text-green-500" />;
    }
    if (type.startsWith('تحويل')) {
        return <ArrowUpFromLine className="h-5 w-5 text-destructive" />;
    }
    if (type.startsWith('تجديد') || type.startsWith('شراء')) {
        return <SatelliteDish className="h-5 w-5 text-primary" />;
    }
    return <SatelliteDish className="h-5 w-5 text-primary" />;
};

export function RecentTransactions() {
  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'transactions'),
            orderBy('transactionDate', 'desc'),
            limit(4)
          )
        : null,
    [user, firestore]
  );

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
             <div key={i} className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
          ))}
        </div>
      );
    }

    if (!transactions || transactions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-10">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-md font-semibold">لا توجد عمليات بعد</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            ستظهر عملياتك الأخيرة هنا.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                {getTransactionIcon(tx.transactionType)}
              </div>
              <div>
                <p className="font-semibold text-sm">{tx.transactionType}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(tx.transactionDate), 'd MMM', { locale: ar })}
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className={`font-bold text-sm ${tx.transactionType.startsWith('تغذية') || tx.transactionType.startsWith('استلام') || tx.transactionType.startsWith('أرباح') ? 'text-green-600' : 'text-destructive'}`}>
                {tx.amount.toLocaleString('en-US')} ريال
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 pt-6 animate-in fade-in-0 duration-500">
        <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-md font-bold">آخر العمليات</h3>
            <Link href="/transactions" className="flex items-center text-sm text-primary dark:text-primary-foreground font-semibold">
                <span>الكل</span>
                <ChevronLeft className="h-4 w-4"/>
            </Link>
        </div>
        <Card>
            <CardContent className="p-2">
                 {renderContent()}
            </CardContent>
        </Card>
    </div>
  );
}
