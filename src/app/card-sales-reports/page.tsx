'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, increment, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, User, Phone, CreditCard, Calendar, AlertCircle, Banknote, Check, TrendingUp } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Network = {
  id: string;
  name: string;
  location: string;
  ownerId: string;
};

type SoldCard = {
    id: string;
    cardNumber: string;
    buyerName: string;
    buyerPhoneNumber: string;
    soldTimestamp: string;
    price: number;
    payoutAmount: number;
    commissionAmount: number;
    categoryName: string;
    payoutStatus: 'pending' | 'completed';
    ownerId: string;
};

const InfoRow = ({ icon: Icon, label, value, isMono = false, valueClassName }: { icon: React.ElementType, label: string, value: string | number, isMono?: boolean, valueClassName?: string }) => (
    <div className="flex justify-between items-center text-xs py-2 border-b last:border-b-0">
        <span className="text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" /> {label}:</span>
        <span className={isMono ? 'font-mono' : `font-semibold ${valueClassName}`}>
            {typeof value === 'number' ? `${value.toLocaleString('en-US')} ريال` : value}
        </span>
    </div>
);

const NetworkDetails = ({ network }: { network: Network }) => {
    const firestore = useFirestore();
    const { toast } = useToast();

    const soldCardsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, 'soldCards'), where('networkId', '==', network.id), orderBy('soldTimestamp', 'desc')) : null,
      [firestore, network.id]
    );
    const { data: soldCards, isLoading: isLoadingSold } = useCollection<SoldCard>(soldCardsQuery);
    
    const { totalSales, totalPayout } = useMemo(() => {
        if (!soldCards) return { totalSales: 0, totalPayout: 0 };
        return soldCards.reduce((acc, card) => {
            acc.totalSales += card.price;
            if (card.payoutStatus === 'completed') {
               acc.totalPayout += card.payoutAmount;
            }
            return acc;
        }, { totalSales: 0, totalPayout: 0 });
    }, [soldCards]);

    if (isLoadingSold) {
        return (
            <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Card className="border-none bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">إجمالي المبيعات</CardTitle>
                        <Banknote className="h-4 w-4 text-primary opacity-50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-primary">{totalSales.toLocaleString('en-US')}</div>
                        <p className="text-[9px] font-bold text-muted-foreground">ريال يمني</p>
                    </CardContent>
                </Card>
                <Card className="border-none bg-green-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-green-600">الأرباح المحولة</CardTitle>
                        <Check className="h-4 w-4 text-green-600 opacity-50" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-black text-green-600">{totalPayout.toLocaleString('en-US')}</div>
                        <p className="text-[9px] font-bold text-muted-foreground">ريال يمني</p>
                    </CardContent>
                </div>
            </div>

            {soldCards && soldCards.length > 0 ? (
                <div className="space-y-3">
                    {soldCards.map(card => (
                        <Card key={card.id} className="p-3 bg-muted/30 border-none rounded-2xl">
                            <InfoRow icon={CreditCard} label="رقم الكرت" value={card.cardNumber} isMono />
                            <InfoRow icon={User} label="المشتري" value={card.buyerName} />
                            <InfoRow icon={Phone} label="رقم المشتري" value={card.buyerPhoneNumber} />
                            <InfoRow icon={Calendar} label="تاريخ البيع" value={format(parseISO(card.soldTimestamp), 'd/M/y, h:mm a', { locale: ar })} />
                            <InfoRow icon={Banknote} label="سعر البيع" value={card.price} valueClassName="text-primary" />
                            <InfoRow icon={TrendingUp} label="المبلغ المحول للمالك" value={card.payoutAmount} valueClassName="text-green-600" />
                            <div className="flex justify-between items-center text-xs py-2">
                                <span className="text-muted-foreground flex items-center gap-2"><Check className="h-4 w-4" /> حالة التحويل:</span>
                                <Badge variant="default" className="bg-green-500 text-white border-none">
                                    تم التحويل تلقائياً
                                </Badge>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">لا توجد مبيعات حالياً لهذه الشبكة.</p>}
        </div>
    )
}

export default function CardSalesReportsPage() {
  const firestore = useFirestore();
  const networksCollection = useMemoFirebase(() => firestore ? query(collection(firestore, 'networks'), orderBy('name')) : null, [firestore]);
  const { data: networks, isLoading } = useCollection<Network>(networksCollection);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      );
    }
    if (!networks || networks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <AlertCircle className="h-16 w-16 text-muted-foreground opacity-20" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">لا توجد شبكات مضافة</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            ستظهر مبيعات الشبكات المحلية هنا بمجرد إضافتها.
          </p>
        </div>
      );
    }
    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-primary">تقارير مبيعات الكروت</h2>
                <p className="text-sm font-bold text-muted-foreground">متابعة المبيعات والعمولات المحولة للملاك (10% عمولة)</p>
            </div>
            
            <Accordion type="single" collapsible className="w-full space-y-3">
                {networks.map(network => (
                    <AccordionItem value={network.id} key={network.id} className="border-none bg-card rounded-2xl shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-4 py-4 hover:no-underline">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-xl">
                                    <Wifi className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-sm block">{network.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold">{network.location}</span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                            <NetworkDetails network={network} />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="تقارير المبيعات" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
      <Toaster/>
    </div>
  );
}
