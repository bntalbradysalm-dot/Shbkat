'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  ChevronLeft, 
  CreditCard,
  Wallet,
  Wifi,
  SatelliteDish,
  ShoppingBag,
  ArrowLeftRight,
  Smartphone,
  Undo2,
  TrendingUp,
  Send,
  Banknote
} from 'lucide-react';
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
    const t = type.toLowerCase();
    if (t.includes('استرجاع')) return Undo2;
    if (t.includes('تغذية') || t.includes('إيداع') || t.includes('استلام')) return Wallet;
    if (t.includes('تحويل')) return Send;
    if (t.includes('سحب')) return Banknote;
    if (t.includes('شراء كرت')) return Wifi;
    if (t.includes('سداد') || t.includes('رصيد') || t.includes('باقة')) return Smartphone;
    if (t.includes('تجديد')) return SatelliteDish;
    if (t.includes('متجر') || t.includes('منتج')) return ShoppingBag;
    if (t.includes('أرباح')) return TrendingUp;
    return CreditCard;
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
            limit(2)
          )
        : null,
    [user, firestore]
  );

  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  return (
    <div className="px-4 pt-8 pb-10 animate-in fade-in-0 duration-500">
        <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-lg font-bold text-primary">آخر العمليات</h3>
            <Link href="/transactions" className="flex items-center text-sm text-primary font-bold">
                <span>الكل</span>
                <ChevronLeft className="h-4 w-4"/>
            </Link>
        </div>
        
        <div className="space-y-3">
            {isLoading ? (
                [1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-3xl" />)
            ) : transactions && transactions.length > 0 ? (
                transactions.map((tx) => {
                    const isCredit = tx.transactionType.includes('تغذية') || 
                                   tx.transactionType.includes('استلام') || 
                                   tx.transactionType.includes('أرباح') || 
                                   tx.transactionType.includes('استرجاع') || 
                                   tx.transactionType.includes('إيداع');
                    
                    const Icon = getTransactionIcon(tx.transactionType);
                    
                    return (
                        <Card key={tx.id} className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card">
                            <CardContent className="p-4 flex items-center justify-between">
                                {/* الأيقونة في اليمين */}
                                <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50 shrink-0">
                                    <Icon className="h-6 w-6" style={{ stroke: 'url(#icon-gradient)' }} />
                                </div>

                                {/* النص في المنتصف */}
                                <div className="flex-1 text-right mx-4 overflow-hidden">
                                    <p className="font-bold text-primary text-sm truncate">{tx.transactionType}</p>
                                    <p className="text-[10px] text-primary/70 font-semibold mt-0.5">
                                        {tx.transactionDate ? format(parseISO(tx.transactionDate), 'd MMMM', { locale: ar }) : 'منذ فترة'}
                                    </p>
                                </div>

                                {/* المبلغ في اليسار */}
                                <div className="text-left shrink-0">
                                    <p className={`font-bold text-base ${isCredit ? 'text-green-600' : 'text-destructive'}`}>
                                        {tx.amount.toLocaleString('en-US')} ر.ي
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">ناجحة</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            ) : (
                <div className="text-center py-10 bg-muted/10 rounded-3xl">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                    <p className="mt-2 text-xs text-muted-foreground">لا توجد عمليات بعد</p>
                </div>
            )}
        </div>
    </div>
  );
}
