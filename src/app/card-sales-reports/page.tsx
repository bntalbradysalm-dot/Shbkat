'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch, updateDoc, increment } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, User, Phone, CreditCard, Calendar, AlertCircle, Banknote, Percent } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type Network = {
  id: string;
  name: string;
  location: string;
  ownerId: string;
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
    payoutAmount: number;
    commissionAmount: number;
    categoryName: string;
    payoutStatus: 'pending' | 'completed';
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
    const { toast } = useToast();
    const [isConfirmingPayout, setIsConfirmingPayout] = useState(false);

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
    
    const pendingPayouts = useMemo(() => soldCards?.filter(c => c.payoutStatus === 'pending') || [], [soldCards]);
    const totalPayoutAmount = useMemo(() => pendingPayouts.reduce((sum, card) => sum + card.payoutAmount, 0), [pendingPayouts]);

    const handlePayout = async () => {
        if (!firestore || !network.ownerId || totalPayoutAmount <= 0) return;

        const batch = writeBatch(firestore);

        // 1. Add balance to network owner
        const ownerRef = doc(firestore, 'users', network.ownerId);
        batch.update(ownerRef, { balance: increment(totalPayoutAmount) });

        // 2. Mark cards as completed
        pendingPayouts.forEach(card => {
            const cardRef = doc(firestore, 'soldCards', card.id);
            batch.update(cardRef, { payoutStatus: 'completed' });
        });

        try {
            await batch.commit();
            toast({
                title: "تم التحويل بنجاح",
                description: `تم تحويل مبلغ ${totalPayoutAmount.toLocaleString('en-US')} ريال إلى حساب مالك الشبكة.`,
            });
        } catch (error) {
            console.error("Payout failed:", error);
            toast({
                variant: 'destructive',
                title: "فشل التحويل",
                description: "حدث خطأ أثناء محاولة تحويل المستحقات.",
            });
        } finally {
            setIsConfirmingPayout(false);
        }
    };
    
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
        <>
        <Tabs defaultValue="pending" className="w-full">
            <Card className="mb-4">
                <CardHeader className="p-4">
                    <CardTitle className="text-base text-center">المستحقات المعلقة</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                     <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{totalPayoutAmount.toLocaleString('en-US')}</p>
                        <p className="text-sm text-muted-foreground">ريال يمني</p>
                    </div>
                    <Button className="w-full" onClick={() => setIsConfirmingPayout(true)} disabled={totalPayoutAmount <= 0}>
                        <Banknote className="ml-2 h-4 w-4" />
                        تحويل المستحقات
                    </Button>
                </CardContent>
            </Card>

            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">
                    للتحويل ({pendingPayouts.length})
                </TabsTrigger>
                <TabsTrigger value="sold">
                    كل المباعة ({soldCards?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="available">
                    المتوفرة ({availableCards?.length || 0})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className='pt-4'>
                {pendingPayouts.length > 0 ? (
                    <div className="space-y-3">
                        {pendingPayouts.map(card => (
                            <Card key={card.id} className="p-3 bg-muted/30">
                                <InfoRow icon={CreditCard} label="رقم الكرت" value={card.cardNumber} isMono />
                                <InfoRow icon={User} label="المشتري" value={card.buyerName} />
                                <InfoRow icon={Calendar} label="تاريخ البيع" value={format(parseISO(card.soldTimestamp), 'd/M/y, h:mm a', { locale: ar })} />
                                <InfoRow icon={Banknote} label="المبلغ المستحق" value={card.payoutAmount} />
                            </Card>
                        ))}
                    </div>
                ) : <p className="text-center text-muted-foreground py-8">لا توجد مستحقات معلقة.</p>}
            </TabsContent>
            <TabsContent value="sold" className='pt-4'>
                {soldCards && soldCards.length > 0 ? (
                    <div className="space-y-3">
                        {soldCards.map(card => (
                            <Card key={card.id} className="p-3 bg-muted/30">
                                <InfoRow icon={CreditCard} label="رقم الكرت" value={card.cardNumber} isMono />
                                <InfoRow icon={User} label="المشتري" value={card.buyerName} />
                                <InfoRow icon={Phone} label="رقم المشتري" value={card.buyerPhoneNumber} />
                                <InfoRow icon={Calendar} label="تاريخ البيع" value={format(parseISO(card.soldTimestamp), 'd/M/y, h:mm a', { locale: ar })} />
                                <div className="flex justify-between items-center text-xs py-2">
                                     <span className="text-muted-foreground flex items-center gap-2"><Banknote className="h-4 w-4" /> الحالة:</span>
                                    <Badge variant={card.payoutStatus === 'completed' ? 'default' : 'secondary'}>{card.payoutStatus === 'completed' ? 'تم التحويل' : 'معلق'}</Badge>
                                </div>
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
        <AlertDialog open={isConfirmingPayout} onOpenChange={setIsConfirmingPayout}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد تحويل المستحقات</AlertDialogTitle>
                    <AlertDialogDescription>
                        هل أنت متأكد من رغبتك في تحويل مبلغ {totalPayoutAmount.toLocaleString('en-US')} ريال إلى حساب مالك الشبكة؟ سيتم تحديث حالة جميع الكروت المعلقة إلى "تم التحويل".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePayout}>تأكيد التحويل</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
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
                <CardDescription className="text-center">اختر شبكة لعرض تقارير مبيعاتها ومستحقاتها.</CardDescription>
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
