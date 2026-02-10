
'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, increment, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, User, Phone, CreditCard, Calendar, AlertCircle, Banknote, Check } from 'lucide-react';
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
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
    const [cardToApprove, setCardToApprove] = useState<SoldCard | null>(null);

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

    const handleApprove = async () => {
        if (!cardToApprove || !firestore) return;

        const soldCardRef = doc(firestore, 'soldCards', cardToApprove.id);
        const ownerRef = doc(firestore, 'users', cardToApprove.ownerId);
        const ownerTransactionsRef = collection(firestore, `users/${cardToApprove.ownerId}/transactions`);
        
        const batch = writeBatch(firestore);
        
        // 1. Update card status to completed
        batch.update(soldCardRef, { payoutStatus: 'completed' });
        
        // 2. Add payoutAmount to owner's balance
        batch.update(ownerRef, { balance: increment(cardToApprove.payoutAmount) });

        // 3. Create transaction log for owner
        const transactionRef = doc(ownerTransactionsRef);
        batch.set(transactionRef, {
             userId: cardToApprove.ownerId,
             transactionDate: new Date().toISOString(),
             amount: cardToApprove.payoutAmount,
             transactionType: 'أرباح مبيعات الكروت',
             notes: `أرباح بيع كرت ${cardToApprove.categoryName}`
        });

        try {
            await batch.commit();
            toast({ title: 'نجاح', description: 'تمت الموافقة على العملية وتحويل المبلغ.'});
        } catch(e) {
            console.error(e);
            toast({ title: 'خطأ', description: 'فشلت عملية الموافقة.', variant: 'destructive'});
        } finally {
            setCardToApprove(null);
        }
    };


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
        <>
        <AlertDialog open={!!cardToApprove} onOpenChange={(isOpen) => !isOpen && setCardToApprove(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد تحويل الربح</AlertDialogTitle>
                    <AlertDialogDescription>
                        هل أنت متأكد من تحويل مبلغ {cardToApprove?.payoutAmount.toLocaleString('en-US')} ريال إلى حساب مالك الشبكة؟
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApprove}>تأكيد</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-primary">{totalSales.toLocaleString('en-US')}</div>
                    <p className="text-xs text-muted-foreground">ريال يمني</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الأرباح المحولة</CardTitle>
                    <Check className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{totalPayout.toLocaleString('en-US')}</div>
                    <p className="text-xs text-muted-foreground">ريال يمني</p>
                </CardContent>
            </Card>
        </div>

        {soldCards && soldCards.length > 0 ? (
            <div className="space-y-3">
                {soldCards.map(card => (
                    <Card key={card.id} className="p-3 bg-muted/30">
                        <InfoRow icon={CreditCard} label="رقم الكرت" value={card.cardNumber} isMono />
                        <InfoRow icon={User} label="المشتري" value={card.buyerName} />
                        <InfoRow icon={Phone} label="رقم المشتري" value={card.buyerPhoneNumber} />
                        <InfoRow icon={Calendar} label="تاريخ البيع" value={format(parseISO(card.soldTimestamp), 'd/M/y, h:mm a', { locale: ar })} />
                        <InfoRow icon={Banknote} label="سعر البيع" value={card.price} valueClassName="text-primary" />
                        <InfoRow icon={Banknote} label="المبلغ المستحق" value={card.payoutAmount} valueClassName="text-green-600" />
                            <div className="flex justify-between items-center text-xs py-2">
                                <span className="text-muted-foreground flex items-center gap-2"><Check className="h-4 w-4" /> حالة الدفع:</span>
                                <div className='flex items-center gap-2'>
                                    <Badge variant={card.payoutStatus === 'completed' ? 'default' : 'secondary'}>{card.payoutStatus === 'completed' ? 'تم التحويل' : 'معلق'}</Badge>
                                    {card.payoutStatus === 'pending' && (
                                        <Button size="sm" onClick={() => setCardToApprove(card)}>
                                            موافقة
                                        </Button>
                                    )}
                                </div>
                            </div>
                    </Card>
                ))}
            </div>
        ) : <p className="text-center text-muted-foreground py-8">لا توجد كروت مباعة.</p>}
        </>
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
                <CardDescription className="text-center">اختر شبكة لعرض تقارير مبيعاتها والموافقة على تحويل الأرباح.</CardDescription>
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
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="تقارير مبيعات الكروت" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
    <Toaster/>
    </>
  );
}
