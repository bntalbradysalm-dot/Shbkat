'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, User, Phone, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

type Network = {
  id: string;
  name: string;
  location: string;
};

type NetworkCard = {
  id: string;
  cardNumber: string;
  status: 'available' | 'sold';
  categoryId: string;
};

type SoldCard = {
    id: string;
    cardNumber: string;
    buyerName: string;
    buyerPhoneNumber: string;
    soldTimestamp: string;
    price: number;
    categoryName: string;
};

const InfoRow = ({ icon: Icon, label, value, isMono = false }: { icon: React.ElementType, label: string, value: string | number, isMono?: boolean }) => (
    <div className="flex justify-between items-center text-xs py-2 border-b last:border-b-0">
        <span className="text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" /> {label}:</span>
        <span className={isMono ? 'font-mono' : 'font-semibold'}>
            {typeof value === 'number' ? `${value.toLocaleString('en-US')} ريال` : value}
        </span>
    </div>
);

const NetworkDetails = ({ network }: { network: Network }) => {
    const firestore = useFirestore();

    const soldCardsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, 'soldCards'), where('networkId', '==', network.id), orderBy('soldTimestamp', 'desc')) : null,
      [firestore, network.id]
    );
    const { data: soldCards, isLoading: isLoadingSold } = useCollection<SoldCard>(soldCardsQuery);

    const availableCardsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, `networks/${network.id}/cards`), where('status', '==', 'available')) : null,
        [firestore, network.id]
    );
    const { data: availableCards, isLoading: isLoadingAvailable } = useCollection<NetworkCard>(availableCardsQuery);
    
    const isLoading = isLoadingSold || isLoadingAvailable;

    if (isLoading) {
        return (
            <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    return (
        <Tabs defaultValue="sold" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sold">
                    المباعة ({soldCards?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="available">
                    المتوفرة ({availableCards?.length || 0})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="sold" className='pt-4'>
                {soldCards && soldCards.length > 0 ? (
                    <div className="space-y-3">
                        {soldCards.map(card => (
                            <Card key={card.id} className="p-3 bg-muted/30">
                                <InfoRow icon={CreditCard} label="رقم الكرت" value={card.cardNumber} isMono />
                                <InfoRow icon={User} label="المشتري" value={card.buyerName} />
                                <InfoRow icon={Phone} label="رقم المشتري" value={card.buyerPhoneNumber} />
                                <InfoRow icon={Calendar} label="تاريخ البيع" value={format(parseISO(card.soldTimestamp), 'd/M/y, h:mm a', { locale: ar })} />
                            </Card>
                        ))}
                    </div>
                ) : <p className="text-center text-muted-foreground py-8">لا توجد كروت مباعة.</p>}
            </TabsContent>
            <TabsContent value="available" className='pt-4'>
                 {availableCards && availableCards.length > 0 ? (
                    <div className="space-y-3">
                        {availableCards.map(card => (
                             <Card key={card.id} className="p-3 bg-muted/30 flex justify-between items-center">
                                <span className='font-mono font-semibold'>{card.cardNumber}</span>
                                <Badge variant="secondary">متوفر</Badge>
                             </Card>
                        ))}
                    </div>
                ) : <p className="text-center text-muted-foreground py-8">لا توجد كروت متوفرة.</p>}
            </TabsContent>
        </Tabs>
    )
}

export default function CardSalesReportsPage() {
  const firestore = useFirestore();
  const networksCollection = useMemoFirebase(() => firestore ? collection(firestore, 'networks') : null, [firestore]);
  const { data: networks, isLoading } = useCollection<Network>(networksCollection);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      );
    }
    if (!networks || networks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <AlertCircle className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">لا توجد شبكات</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            الرجاء إضافة شبكات أولاً من صفحة إدارة الشبكات.
          </p>
        </div>
      );
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center">تقارير مبيعات الكروت</CardTitle>
                <CardDescription className="text-center">اختر شبكة لعرض تقارير مبيعاتها.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {networks.map(network => (
                        <AccordionItem value={network.id} key={network.id}>
                            <AccordionTrigger>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <Wifi className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="font-semibold">{network.name}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <NetworkDetails network={network} />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="تقارير مبيعات الكروت" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
