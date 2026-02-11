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
  Loader2, 
  Zap, 
  Smartphone,
  Search,
  Activity
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
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type QueryResult = {
    balance?: string;
    packName?: string;
    expireDate?: string;
    message?: string;
};

type Offer = {
    offerId: string;
    offerName: string;
    price: number;
    data: string;
    validity: string;
    offertype: string;
};

const YEMEN_4G_OFFERS: Offer[] = [
    { offerId: '4g_15gb', offerName: 'يمن فورجي 15 جيجا', price: 2400, data: '15 GB', validity: '30 يوم', offertype: '4G_15GB' },
    { offerId: '4g_25gb', offerName: 'يمن فورجي 25 جيجا', price: 4000, data: '25 GB', validity: '30 يوم', offertype: '4G_25GB' },
    { offerId: '4g_60gb', offerName: 'يمن فورجي 60 جيجا', price: 8000, data: '60 GB', validity: '30 يوم', offertype: '4G_60GB' },
    { offerId: '4g_130gb', offerName: 'يمن فورجي 130 جيجا', price: 16000, data: '130 GB', validity: '30 يوم', offertype: '4G_130GB' },
    { offerId: '4g_250gb', offerName: 'يمن فورجي 250 جيجا', price: 26000, data: '250 GB', validity: '30 يوم', offertype: '4G_250GB' },
    { offerId: '4g_500gb', offerName: 'يمن فورجي 500 جيجا', price: 46000, data: '500 GB', validity: '30 يوم', offertype: '4G_500GB' },
];

const PackageCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-primary/5 mb-3 text-right cursor-pointer hover:bg-primary/5 transition-all active:scale-[0.98] group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
          <div className="bg-primary/10 text-primary font-black text-[10px] px-2 py-1 rounded-lg">4G LTE</div>
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{offer.offerName}</h4>
      </div>
      
      <div className="flex items-baseline gap-1 justify-end mb-3">
        <span className="text-xl font-black text-primary">{offer.price.toLocaleString()}</span>
        <span className="text-[10px] font-bold text-muted-foreground">ريال</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/5">
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-1.5 rounded-xl text-center">
            <p className="text-[10px] font-bold">{offer.data}</p>
        </div>
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-1.5 rounded-xl text-center">
            <p className="text-[10px] font-bold">{offer.validity}</p>
        </div>
      </div>
    </div>
);

export default function Yemen4GPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('10');
    const [activeTab, setActiveTab] = useState("packages");
    const [isSearching, setIsSearching] = useState(false);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [amount, setAmount] = useState('');
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isActivatingOffer, setIsActivatingOffer] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
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
        if (phone.length !== 9 || !phone.startsWith('10')) {
            setQueryResult(null);
        }
    }, [phone]);

    const handleSearch = async () => {
        if (!phone || phone.length !== 9) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم هاتف صحيح مكون من 9 أرققاً' });
            return;
        }
        setIsSearching(true);
        setQueryResult(null);
        try {
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, action: 'query', service: 'yem4g' })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.resultDesc || result.message || 'فشل الاستعلام.');
            
            let rawBalance = result.balance || '';
            let displayBalance = '0 MB';
            let displayExpire = '...';

            if (rawBalance.includes('رصيد الباقة')) {
                const balMatch = rawBalance.match(/رصيد الباقة:\s*([\d.]+)\s*GB/);
                if (balMatch) displayBalance = `${balMatch[1]} GB`;

                const dateMatch = rawBalance.match(/تأريخ الانتهاء:\s*(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                    displayExpire = `${parseInt(dateMatch[3])}/${parseInt(dateMatch[2])}/${dateMatch[1]}`;
                }
            } else {
                displayBalance = formatData(rawBalance);
                displayExpire = result.expireDate || '...';
                if (displayExpire && displayExpire.includes('-')) {
                    const parts = displayExpire.split(' ')[0].split('-');
                    if (parts.length === 3) displayExpire = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
                }
            }
            
            setQueryResult({
                balance: displayBalance,
                packName: result.packName,
                expireDate: displayExpire,
                message: result.resultDesc
            });
        } catch (error: any) {
            console.error("Search Error:", error);
            toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: error.message });
        } finally {
            setIsSearching(false);
        }
    };

    const handlePayment = async () => {
        if (!phone || !amount || !user || !userDocRef || !firestore) return;
        const baseAmount = parseFloat(amount);
        if (isNaN(baseAmount) || baseAmount <= 0) return;

        const commission = Math.ceil(baseAmount * 0.05);
        const totalToDeduct = baseAmount + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لإتمام العملية شاملة النسبة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const transid = Date.now().toString();
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    amount: baseAmount, 
                    action: 'bill',
                    service: 'yem4g',
                    type: '2', 
                    transid: transid,
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشلت عملية السداد من المصدر.');
            
            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: totalToDeduct,
                transactionType: 'سداد يمن فورجي',
                notes: `إلى رقم: ${phone}. تشمل النسبة: ${commission} ر.ي`,
                recipientPhoneNumber: phone
            });
            await batch.commit();
            setShowSuccess(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل السداد', description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirming(false);
        }
    };

    const handleActivateOffer = async () => {
        if (!selectedOffer || !phone || !user || !userDocRef || !firestore) return;
        
        const basePrice = selectedOffer.price;
        const commission = Math.ceil(basePrice * 0.05);
        const totalToDeduct = basePrice + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لتفعيل الباقة شاملة النسبة.' });
            return;
        }

        setIsActivatingOffer(true);
        try {
            const transid = Date.now().toString();
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    action: 'bill', 
                    service: 'yem4g', 
                    amount: basePrice,
                    type: '1',
                    transid 
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل تفعيل الباقة.');

            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid, transactionDate: new Date().toISOString(), amount: totalToDeduct,
                transactionType: `تفعيل ${selectedOffer.offerName}`, notes: `للرقم: ${phone}. تشمل النسبة: ${commission} ر.ي`, recipientPhoneNumber: phone
            });
            await batch.commit();
            toast({ title: 'تم التفعيل', description: 'تم تفعيل باقة الفورجي بنجاح' });
            setSelectedOffer(null);
            handleSearch();
        } catch (e: any) {
            toast({ variant: "destructive", title: "خطأ", description: e.message });
        } finally {
            setIsActivatingOffer(false);
        }
    };

    const formatData = (balance: string | undefined) => {
        if (!balance) return '0 MB';
        if (balance.includes('GB') || balance.includes('MB')) return balance;
        const numericBalance = parseFloat(balance);
        if (isNaN(numericBalance)) return balance;
        if (numericBalance >= 1024) return `${(numericBalance / 1024).toFixed(2)} GB`;
        return `${numericBalance.toFixed(0)} MB`;
    };

    if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ السداد..." />;

    if (showSuccess) {
        return (
            <>
                <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
                <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                    <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none">
                        <div className="bg-green-500 p-8 flex justify-center">
                            <CheckCircle className="h-20 w-20 text-white" />
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <h2 className="text-2xl font-black text-green-600">تم السداد بنجاح</h2>
                            <div className="bg-muted p-4 rounded-2xl">
                                <p className="text-xs text-muted-foreground mb-1">المبلغ المخصوم (مع النسبة)</p>
                                <p className="text-2xl font-black text-primary">{(parseFloat(amount) + Math.ceil(parseFloat(amount)*0.05)).toLocaleString('en-US')} ريال</p>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-bold text-lg" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
            <SimpleHeader title="يمن فورجي" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Balance Card */}
                <Card className="overflow-hidden rounded-[28px] shadow-lg bg-mesh-gradient text-white border-none mb-4">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="text-right">
                            <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-2xl font-black">{userProfile?.balance?.toLocaleString() || '0'}</h2>
                                <span className="text-[10px] font-bold opacity-70">ريال يمني</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-primary/5">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم خدمة فورجي</Label>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Input
                            type="tel"
                            placeholder="10xxxxxxx"
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val === '' || val.startsWith('10')) {
                                    setPhone(val.slice(0, 9));
                                }
                            }}
                            className="text-center font-bold text-2xl h-14 rounded-2xl border-none bg-muted/20 focus-visible:ring-primary transition-all tracking-widest"
                        />
                        {phone.length === 9 && (
                            <Button 
                                onClick={handleSearch} 
                                disabled={isSearching}
                                className="h-12 rounded-2xl font-bold animate-in slide-in-from-top-2 fade-in-0"
                            >
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Search className="w-5 h-5 ml-2" />}
                                استعلام
                            </Button>
                        )}
                    </div>
                </div>

                {phone.length === 9 && phone.startsWith('10') && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                        {queryResult && (
                            <div className="bg-mesh-gradient rounded-3xl overflow-hidden shadow-lg p-1 animate-in zoom-in-95">
                                <div className="bg-white/10 backdrop-blur-md rounded-[22px] grid grid-cols-2 text-center text-white">
                                    <div className="p-4 border-l border-white/10">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">الرصيد المتبقي</p>
                                        <p className="text-base font-black">{queryResult.balance}</p>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">تاريخ الانتهاء</p>
                                        <p className="text-sm font-black">{queryResult.expireDate}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Tabs defaultValue="packages" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-primary/5">
                                <TabsTrigger value="packages" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الباقات</TabsTrigger>
                                <TabsTrigger value="balance" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">سداد رصيد</TabsTrigger>
                            </TabsList>

                            <TabsContent value="packages" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="grid grid-cols-1 gap-1">
                                    {YEMEN_4G_OFFERS.map((offer) => (
                                        <PackageCard 
                                            key={offer.offerId} 
                                            offer={offer} 
                                            onClick={() => setSelectedOffer(offer)} 
                                        />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="balance" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-primary/5 text-center">
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Smartphone className="w-8 h-8 text-primary" />
                                    </div>
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">أدخل مبلغ السداد المباشر</Label>
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
                                        onClick={() => setIsConfirming(true)} 
                                        disabled={!amount}
                                    >
                                        تنفيذ السداد
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                            <Wallet className="w-8 h-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-center font-black">تأكيد سداد رصيد</AlertDialogTitle>
                        <div className="space-y-3 pt-4 text-right text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">رقم الهاتف:</span>
                                <span className="font-bold">{phone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">المبلغ الأساسي:</span>
                                <span className="font-bold">{amount} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة:</span>
                                <span className="font-bold text-orange-600">{Math.ceil(parseFloat(amount || '0') * 0.05)} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">إجمالي المطلوب:</span>
                                <span className="font-black text-primary text-lg">{parseFloat(amount || '0') + Math.ceil(parseFloat(amount || '0') * 0.05)} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction className="w-full rounded-2xl h-12 font-bold" onClick={handlePayment}>تأكيد السداد</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                            <Zap className="w-8 h-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-center font-black">تأكيد تفعيل الباقة</AlertDialogTitle>
                        <div className="py-4 space-y-3 text-right text-sm">
                            <p className="text-center text-lg font-black text-primary mb-2">{selectedOffer?.offerName}</p>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">سعر الباقة:</span>
                                <span className="font-bold">{selectedOffer?.price.toLocaleString()} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة:</span>
                                <span className="font-bold text-orange-600">{Math.ceil((selectedOffer?.price || 0) * 0.05)} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">إجمالي الخصم:</span>
                                <span className="font-black text-primary text-lg">{(selectedOffer?.price || 0) + Math.ceil((selectedOffer?.price || 0) * 0.05)} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0" disabled={isActivatingOffer}>تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={handleActivateOffer} className="w-full rounded-2xl h-12 font-bold" disabled={isActivatingOffer}>
                            {isActivatingOffer ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تفعيل الآن'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Toaster />
        </div>
    );
}
