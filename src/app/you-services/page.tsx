'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  CheckCircle, 
  Search,
  Hash,
  Calendar,
  History,
  Smartphone,
  Zap,
  Clock,
  Package,
  Loader2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type QueryResult = {
    balance?: string;
    customer_type?: string;
    message?: string;
};

type FastOffer = {
    num: string;
    value: string;
    price: number;
    title: string;
};

const YOU_FAST_OFFERS: FastOffer[] = [
    { num: '4', value: '410', price: 1700, title: 'شحن 410 ريال' },
    { num: '6', value: '830', price: 3500, title: 'شحن 830 ريال' },
    { num: '11', value: '1000', price: 4000, title: 'شحن 1000 ريال' },
    { num: '7', value: '1250', price: 5000, title: 'شحن 1250 ريال' },
    { num: '8', value: '2500', price: 10000, title: 'شحن 2500 ريال' },
    { num: '9', value: '5000', price: 19000, title: 'شحن 5000 ريال' },
    { num: '10', value: '7500', price: 29000, title: 'شحن 7500 ريال' },
];

const FastOfferCard = ({ offer, onClick }: { offer: FastOffer, onClick: () => void }) => (
    <div 
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-primary/5 mb-3 text-right cursor-pointer hover:bg-primary/5 transition-all active:scale-[0.98] group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
          <div className="bg-[#FFCC00] text-black font-black text-[10px] px-2 py-1 rounded-lg uppercase">YOU FAST</div>
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{offer.title}</h4>
      </div>
      
      <div className="flex items-baseline gap-1 justify-end">
        <span className="text-xl font-black text-primary">{offer.price.toLocaleString('en-US')}</span>
        <span className="text-[10px] font-bold text-muted-foreground">ريال</span>
      </div>
    </div>
);

export default function YouServicesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('');
    const [activeTab, setActiveTab] = useState("balance");
    const [isSearching, setIsSearching] = useState(false);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [amount, setAmount] = useState('');
    const [selectedFastOffer, setSelectedFastOffer] = useState<FastOffer | null>(null);
    const [isConfirmingBalance, setIsConfirmingBalance] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastTxDetails, setLastTxDetails] = useState<any>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const userDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    useEffect(() => {
        if (showSuccess && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }, [showSuccess]);

    useEffect(() => {
        if (phone.length === 9 && !phone.startsWith('73')) {
            toast({
                variant: 'destructive',
                title: 'خطأ في الرقم',
                description: 'رقم YOU يجب أن يبدأ بـ 73'
            });
            setQueryResult(null);
        }
        if (phone.length !== 9) {
            setQueryResult(null);
        }
    }, [phone, toast]);

    const handleSearch = async () => {
        if (!phone || phone.length !== 9 || !phone.startsWith('73')) return;
        
        setIsSearching(true);
        setQueryResult(null);
        try {
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    action: 'query', 
                    service: 'you'
                })
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || 'فشل الاستعلام من المصدر.');
            
            setQueryResult({
                balance: result.balance || '0.00',
                customer_type: result.mobileTy || '...',
                message: result.resultDesc
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: error.message });
        } finally {
            setIsSearching(false);
        }
    };

    const handleProcessPayment = async (payAmount: number, typeLabel: string, numCode: string = '0') => {
        if (!phone || !user || !userDocRef || !firestore) return;

        const baseAmount = payAmount;
        const commission = Math.ceil(baseAmount * 0.10);
        const totalToDeduct = baseAmount + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام هذه العملية شاملة النسبة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const transid = Date.now().toString().slice(-8);
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    amount: baseAmount, 
                    action: 'bill',
                    service: 'you',
                    num: numCode,
                    type: 'prepaid', // Default to prepaid
                    transid: transid,
                })
            });
            const result = await response.json();
            
            const isSuccess = result.resultCode === "0" || result.resultCode === 0;
            const isPending = result.resultCode === "-2" || result.resultCode === -2;

            if (!response.ok || (!isSuccess && !isPending)) {
                throw new Error(result.message || 'فشلت عملية السداد من المصدر.');
            }
            
            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: totalToDeduct,
                transactionType: `سداد YOU ${typeLabel}`,
                notes: `إلى رقم: ${phone}. تشمل النسبة: ${commission} ر.ي. الحالة: ${isPending ? 'قيد التنفيذ' : 'ناجحة'}`,
                recipientPhoneNumber: phone,
                transid: transid
            });
            await batch.commit();
            
            setLastTxDetails({
                type: `سداد YOU ${typeLabel}`,
                phone: phone,
                amount: totalToDeduct,
                transid: transid
            });
            setShowSuccess(true);
        } catch (error: any) {
            toast({ variant: "destructive", title: "فشل السداد", description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirmingBalance(false);
            setSelectedFastOffer(null);
        }
    };

    if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ العملية..." />;

    if (showSuccess && lastTxDetails) {
        return (
            <>
                <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                    <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
                        <div className="bg-green-500 p-8 flex justify-center">
                            <div className="bg-white/20 p-4 rounded-full animate-bounce">
                                <CheckCircle className="h-20 w-20 text-white" />
                            </div>
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <div>
                                <h2 className="text-2xl font-black text-green-600">تمت العملية بنجاح</h2>
                                <p className="text-sm text-muted-foreground mt-1">تم تنفيذ الطلب بنجاح</p>
                            </div>

                            <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم العملية:</span>
                                    <span className="font-mono font-black text-primary">{lastTxDetails.transid}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> رقم الهاتف:</span>
                                    <span className="font-mono font-bold tracking-widest">{lastTxDetails.phone}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" /> النوع:</span>
                                    <span className="font-bold">{lastTxDetails.type}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> المبلغ المخصوم:</span>
                                    <span className="font-black text-primary">{lastTxDetails.amount.toLocaleString('en-US')} ريال</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> التاريخ:</span>
                                    <span className="text-[10px] font-bold">{format(new Date(), 'Pp', { locale: ar })}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="w-full h-14 rounded-2xl font-bold text-lg" onClick={() => router.push('/login')}>الرئيسية</Button>
                                <Button className="w-full h-14 rounded-2xl font-bold text-lg" onClick={() => router.push('/transactions')}>
                                    <History className="ml-2 h-4 w-4" /> العمليات
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
            <SimpleHeader title="خدمات YOU" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                <Card className="overflow-hidden rounded-[28px] shadow-lg bg-mesh-gradient text-white border-none mb-4">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="text-right">
                            <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-2xl font-black text-white">{userProfile?.balance?.toLocaleString('en-US') || '0'}</h2>
                                <span className="text-[10px] font-bold opacity-70 text-white">ريال يمني</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-primary/5">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم الهاتف</Label>
                    </div>
                    <Input
                        type="tel"
                        placeholder="73xxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 focus-visible:ring-primary transition-all"
                    />
                    {phone.length === 9 && phone.startsWith('73') && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <Button 
                                className="w-full h-12 rounded-2xl font-bold mt-4 shadow-sm" 
                                onClick={handleSearch}
                                disabled={isSearching}
                            >
                                {isSearching ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Search className="ml-2 h-4 w-4" />}
                                استعلام
                            </Button>
                        </div>
                    )}
                </div>

                {phone.length === 9 && phone.startsWith('73') && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                        {queryResult && (
                            <div className="bg-mesh-gradient rounded-3xl overflow-hidden shadow-lg p-1 animate-in zoom-in-95">
                                <div className="bg-white/10 backdrop-blur-md rounded-[22px] grid grid-cols-2 text-center text-white">
                                    <div className="p-3 border-l border-white/10">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">الرصيد المتبقي</p>
                                        <p className="text-sm font-black">{queryResult.balance} ر.ي</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">نوع الرقم</p>
                                        <p className="text-sm font-black">{queryResult.customer_type}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Tabs defaultValue="balance" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-primary/5">
                                <TabsTrigger value="balance" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-white">رصيد</TabsTrigger>
                                <TabsTrigger value="fast" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-white">فوري</TabsTrigger>
                                <TabsTrigger value="packages" className="rounded-xl font-bold text-xs data-[state=active]:bg-primary data-[state=active]:text-white">الباقات</TabsTrigger>
                            </TabsList>

                            <TabsContent value="balance" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-primary/5 text-center">
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">ادخل المبلغ</Label>
                                    <div className="relative max-w-[240px] mx-auto">
                                        <Input 
                                            type="number" 
                                            placeholder="0.00" 
                                            value={amount} 
                                            onChange={(e) => setAmount(e.target.value)} 
                                            className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none text-primary placeholder:text-primary/10" 
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 font-black text-sm">ر.ي</div>
                                    </div>
                                    <Button 
                                        className="w-full h-14 rounded-2xl text-lg font-black mt-8 shadow-lg shadow-primary/20" 
                                        onClick={() => setIsConfirmingBalance(true)} 
                                        disabled={!amount}
                                    >
                                        تنفيذ السداد
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="fast" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="grid grid-cols-1 gap-1">
                                    {YOU_FAST_OFFERS.map((offer) => (
                                        <FastOfferCard 
                                            key={offer.num} 
                                            offer={offer} 
                                            onClick={() => setSelectedFastOffer(offer)} 
                                        />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="packages" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 shadow-sm border border-primary/5 text-center">
                                    <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                                    <h3 className="text-lg font-black text-muted-foreground">الباقات قريباً</h3>
                                    <p className="text-xs font-bold text-muted-foreground mt-2">سيتم إضافة باقات شركة YOU في التحديث القادم</p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            <Toaster />

            {/* Confirm Manual Balance Dialog */}
            <AlertDialog open={isConfirmingBalance} onOpenChange={setIsConfirmingBalance}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد سداد رصيد</AlertDialogTitle>
                        <div className="space-y-3 pt-4 text-right text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">رقم الهاتف:</span>
                                <span className="font-bold">{phone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">المبلغ الأساسي:</span>
                                <span className="font-bold">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة (10%):</span>
                                <span className="font-bold text-orange-600">{Math.ceil(parseFloat(amount || '0') * 0.10).toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">إجمالي المطلوب:</span>
                                <span className="font-black text-primary text-lg">{(parseFloat(amount || '0') + Math.ceil(parseFloat(amount || '0') * 0.10)).toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction className="w-full rounded-2xl h-12 font-bold" onClick={() => handleProcessPayment(parseFloat(amount), 'رصيد')}>تأكيد</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Confirm Fast Charge Dialog */}
            <AlertDialog open={!!selectedFastOffer} onOpenChange={() => setSelectedFastOffer(null)}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد شحن فوري</AlertDialogTitle>
                        <div className="py-4 space-y-3 text-right text-sm">
                            <p className="text-center text-lg font-black text-primary mb-2">{selectedFastOffer?.title}</p>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">رقم الهاتف:</span>
                                <span className="font-bold">{phone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">سعر الشحن:</span>
                                <span className="font-bold">{selectedFastOffer?.price.toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة (10%):</span>
                                <span className="font-bold text-orange-600">{Math.ceil((selectedFastOffer?.price || 0) * 0.10).toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">إجمالي الخصم:</span>
                                <span className="font-black text-primary text-lg">{( (selectedFastOffer?.price || 0) + Math.ceil((selectedFastOffer?.price || 0) * 0.10) ).toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={() => selectedFastOffer && handleProcessPayment(selectedFastOffer.price, selectedFastOffer.title, selectedFastOffer.num)} className="w-full rounded-2xl h-12 font-bold">
                            تفعيل الآن
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
