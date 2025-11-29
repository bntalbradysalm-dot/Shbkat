'use client';

import React, { useMemo } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Tag, Phone, CreditCard, Calendar, Wallet, TrendingUp } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

type RenewalRequest = {
  id: string;
  userName: string;
  userPhoneNumber: string;
  packageTitle: string;
  packagePrice: number;
  subscriberName: string;
  cardNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
};

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex justify-between items-center text-xs py-2 border-b">
      <span className="text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" /> {label}:</span>
      <span className="font-semibold">{typeof value === 'number' ? `${value.toLocaleString('en-US')} ريال` : value}</span>
  </div>
);

export default function AlwadiReportsPage() {
  const firestore = useFirestore();

  const approvedRequestsQuery = useMemoFirebase(
    () => (firestore ? query(
        collection(firestore, 'renewalRequests'), 
        where('status', '==', 'approved'),
        orderBy('requestTimestamp', 'desc')
    ) : null),
    [firestore]
  );
  const { data: requests, isLoading } = useCollection<RenewalRequest>(approvedRequestsQuery);

  const { monthlyData, totalAmount, totalProfit } = useMemo(() => {
    if (!requests) {
      return { monthlyData: {}, totalAmount: 0, totalProfit: 0 };
    }

    const data: { [key: string]: RenewalRequest[] } = {};
    let total = 0;

    requests.forEach(req => {
      const monthKey = format(parseISO(req.requestTimestamp), 'yyyy-MM');
      if (!data[monthKey]) {
        data[monthKey] = [];
      }
      data[monthKey].push(req);
      total += req.packagePrice;
    });

    return { 
        monthlyData: data, 
        totalAmount: total,
        totalProfit: total * 0.05
    };
  }, [requests]);

  const sortedMonths = Object.keys(monthlyData).sort().reverse();
  const defaultTab = sortedMonths.length > 0 ? sortedMonths[0] : '';
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (!requests || requests.length === 0) {
        return <p className="text-center text-muted-foreground mt-10">لا توجد طلبات مكتملة لعرضها.</p>;
    }

    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المبالغ</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary dark:text-primary-foreground">{totalAmount.toLocaleString('en-US')}</div>
                    <p className="text-xs text-muted-foreground">ريال يمني</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الربح (5%)</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{totalProfit.toLocaleString('en-US')}</div>
                    <p className="text-xs text-muted-foreground">ريال يمني</p>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {sortedMonths.map(monthKey => (
              <TabsTrigger key={monthKey} value={monthKey}>
                {format(parseISO(`${monthKey}-01`), 'MMM yyyy', { locale: ar })}
              </TabsTrigger>
            ))}
          </TabsList>
          {sortedMonths.map(monthKey => {
            const monthRequests = monthlyData[monthKey];
            const monthTotal = monthRequests.reduce((sum, req) => sum + req.packagePrice, 0);

            return (
              <TabsContent key={monthKey} value={monthKey} className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className='text-base flex justify-between items-center'>
                           <span>طلبات شهر {format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: ar })}</span>
                           <span className='text-sm font-bold text-primary dark:text-primary-foreground'>{monthTotal.toLocaleString('en-US')} ريال</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {monthRequests.map(request => (
                            <Card key={request.id} className="p-3 bg-muted/30">
                               <div className="space-y-1">
                                <InfoRow icon={User} label="اسم المستخدم" value={request.userName} />
                                <InfoRow icon={Tag} label="الباقة" value={request.packageTitle} />
                                <InfoRow icon={CreditCard} label="رقم الكرت" value={request.cardNumber} />
                                <InfoRow icon={Calendar} label="التاريخ" value={format(parseISO(request.requestTimestamp), 'd/M/y, h:mm a', { locale: ar })} />
                                <InfoRow icon={Wallet} label="المبلغ" value={request.packagePrice} />
                               </div>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="تقارير منظومة الوادي" />
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
