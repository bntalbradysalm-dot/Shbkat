
'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch, increment } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, User, CreditCard, Calendar, AlertCircle, Banknote, Check, TrendingUp, ShieldCheck, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    networkName?: string;
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
    const [isTransferring, setIsTransferring] = useState<string | null>(null);

    const soldCardsQuery = useMemoFirebase(
      () => firestore ? query(collection(firestore, 'soldCards'), where('networkId', '==', network.id), orderBy('soldTimestamp', 'desc')) : null,
      [firestore, network.id]
    );
    const { data: soldCards, isLoading: isLoadingSold } = useCollection<SoldCard>(soldCardsQuery);
    
    const { totalSales, totalPayout, totalCommission } = useMemo(() => {
        if (!soldCards) return { totalSales: 0, totalPayout: 0, totalCommission: 0 };
        return soldCards.reduce((acc, card) => {
            acc.totalSales += card.price;
            acc.totalPayout += card.payoutAmount;
            acc.totalCommission += card.commissionAmount;
            return acc;
        }, { totalSales: 0, totalPayout: 0, totalCommission: 0 });
    }, [soldCards]);

    const handleTransferProfit = async (card: SoldCard) => {
        if (!firestore || !card.ownerId) return;
        setIsTransferring(card.id);

        try {
            const batch = writeBatch(firestore);
            const now = new Date().toISOString();

            // 1. تحديث حالة الطلب إلى مكتمل
            batch.update(doc(firestore, 'soldCards', card.id), { payoutStatus: 'completed' });

            // 2. تحويل الرصيد للمالك
            const ownerRef = doc(firestore, 'users', card.ownerId);
            batch.update(ownerRef, { balance: increment(card.payoutAmount) });

            // 3. إضافة سجل عملية للمالك
            const ownerTxRef = doc(collection(firestore, `users/${card.ownerId}/transactions`));
            batch.set(ownerTxRef, {
                userId: card.ownerId,
                transactionDate: now,
                amount: card.payoutAmount,
                transactionType: 'أرباح مبيعات الكروت',
                notes: `تم تحويل أرباح كرت ${card.categoryName} - شبكة: ${network.name}`
            });

            await batch.commit();
            toast({ title: "نجاح", description: "تم تحويل الربح للمالك بنجاح." });
        } catch (e) {
            toast({ variant: "destructive", title: "خطأ", description: "فشل تحويل الربح." });
        } finally {
            setIsTransferring(null);
        }
    };

    if (isLoadingSold) {
        return (
            <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <Card className="border-none bg-primary/5 p-2">
                    <p className="text-[8px] font-black uppercase text-primary mb-1">المبيعات</p>
                    <div className="text-sm font-black text-primary">{totalSales.toLocaleString()}</div>
                </Card>
                <Card className="border-none bg-green-500/5 p-2">
                    <p className="text-[8px] font-black uppercase text-green-600 mb-1">للمالك</p>
                    <div className="text-sm font-black text-green-600">{totalPayout.toLocaleString()}</div>
                </Card>
                <Card className="border-none bg-orange-500/5 p-2">
                    <p className="text-[8px] font-black uppercase text-orange-600 mb-1">العمولة</p>
                    <div className="text-sm font-black text-orange-600">{totalCommission.toLocaleString()}</div>
                </Card>
            </div>

            {soldCards && soldCards.length > 0 ? (
                <div className="space-y-3">
                    {soldCards.map(card => (
                        <Card key={card.id} className="p-3 bg-muted/30 border-none rounded-2xl relative overflow-hidden">
                            <InfoRow icon={CreditCard} label="رقم الكرت" value={card.cardNumber} isMono />
                            <InfoRow icon={User} label="المشتري" value={card.buyerName} />
                            <InfoRow icon={Calendar} label="تاريخ البيع" value={format(parseISO(card.soldTimestamp), 'd/M/y, h:mm a', { locale: ar })} />
                            <InfoRow icon={Banknote} label="سعر البيع" value={card.price} valueClassName="text-primary" />
                            <InfoRow icon={TrendingUp} label="حصة المالك" value={card.payoutAmount} valueClassName="text-green-600" />
                            
                            <div className="flex justify-between items-center pt-3 mt-2 border-t border-dashed">
                                {card.payoutStatus === 'completed' ? (
                                    <Badge className="bg-green-500 text-white border-none px-3 py-1 rounded-lg flex items-center gap-1.5">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span className="text-[9px] font-black">تم التحويل (90%)</span>
                                    </Badge>
                                ) : (
                                    <>
                                        <Badge className="bg-orange-500/10 text-orange-600 border-none px-3 py-1 rounded-lg">
                                            <span className="text-[9px] font-black">انتظار التحويل</span>
                                        </Badge>
                                        <Button 
                                            size="sm" 
                                            className="h-7 text-[9px] font-black bg-green-600 hover:bg-green-700"
                                            onClick={() => handleTransferProfit(card)}
                                            disabled={isTransferring === card.id}
                                        >
                                            {isTransferring === card.id ? <Loader2 className="animate-spin h-3 w-3" /> : "تحويل الربح للمالك"}
                                        </Button>
                                    </>
                                )}
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
  const { user } = useUser();
  const networksCollection = useMemoFirebase(() => firestore ? query(collection(firestore, 'networks'), orderBy('name')) : null, [firestore]);
  const { data: networks, isLoading } = useCollection<Network>(networksCollection);

  const isAdmin = user?.email === '770326828@shabakat.com';

  if (!isAdmin) {
      return <div className="p-10 text-center font-bold">عذراً، هذه الصفحة مخصصة لمالك التطبيق فقط.</div>;
  }

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
          <p className="mt-1 text-sm text-muted-foreground">ستظهر مبيعات الشبكات المحلية هنا بمجرد إضافتها.</p>
        </div>
      );
    }
    return (
        <div className="space-y-6">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-black text-primary">تحويل أرباح الملاك</h2>
                <p className="text-sm font-bold text-muted-foreground">مراجعة مبيعات الشبكات وتحويل المستحقات يدوياً</p>
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl mt-4">
                    <p className="text-[10px] text-orange-700 font-black leading-relaxed">
                        ⚠️ نظام التحويل اليدوي: قم بمراجعة كل عملية بيع والضغط على "تحويل الربح" ليتم إضافة 90% من قيمة الكرت إلى رصيد مالك الشبكة فوراً.
                    </p>
                </div>
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
      <SimpleHeader title="تحويل الأرباح" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
      <Toaster/>
    </div>
  );
}
