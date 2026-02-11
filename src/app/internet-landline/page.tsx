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
  Search,
  Wifi,
  Phone,
  Globe,
  Zap,
  Activity,
  Hash,
  Calendar,
  History
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
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
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type QueryResult = {
    balance?: string;
    packagePrice?: string;
    expireDate?: string;
    message?: string;
};

export default function LandlineRedesignPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('');
    const [activeTab, setActiveTab] = useState("internet");
    const [isSearching, setIsSearching] = useState(false);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [amount, setAmount] = useState('');
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
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
        if (phone.length === 8) {
            if (!phone.startsWith('0')) {
                toast({
                    variant: 'destructive',
                    title: 'خطأ في الرقم',
                    description: 'رقم الثابت يجب أن يبدأ بـ 0'
                });
                setQueryResult(null);
                return;
            }
            handleSearch();
        } else {
            setQueryResult(null);
        }
    }, [phone]);

    const handleSearch = async () => {
        if (!phone || phone.length !== 8 || !phone.startsWith('0')) return;
        setIsSearching(true);
        setQueryResult(null);
        try {
            const searchType = activeTab === 'internet' ? 'adsl' : 'line';
            
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    action: 'query', 
                    service: 'post',
                    type: searchType 
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل الاستعلام من المصدر.');
            
            const raw = result.balance || '';
            let balance = '0.00 GB';
            let price = '0';
            let expiry = '...';

            const balMatch = raw.match(/(الرصيد المتبقي|رصيد الباقة):\s*([\d.]+)/i);
            if (balMatch) balance = `${balMatch[2]} GB`;
            else if (!isNaN(parseFloat(raw))) balance = `${parseFloat(raw).toLocaleString('en-US')} ريال`;

            const priceMatch = raw.match(/قيمة الباقة:\s*([\d.]+)/i);
            if (priceMatch) price = priceMatch[1];

            const dateMatch = raw.match(/تأريخ الانتهاء:\s*(\d{4})[-]?(\d{2})[-]?(\d{2})/i);
            if (dateMatch) {
                expiry = `${parseInt(dateMatch[3])}/${parseInt(dateMatch[2])}/${dateMatch[1]}`;
            }
            
            setQueryResult({
                balance,
                packagePrice: price,
                expireDate: expiry,
                message: result.resultDesc
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: error.message });
        } finally {
            setIsSearching(false);
        }
    };

    const handleOpenConfirm = () => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < 250) {
            toast({
                variant: 'destructive',
                title: 'خطأ في المبلغ',
                description: 'أقل مبلغ للسداد هو 250 ريال.',
            });
            return;
        }
        setIsConfirmingPayment(true);
    };

    const handlePayment = async (payAmount: number, typeLabel: string) => {
        if (!phone || !user || !userDocRef || !firestore) return;

        const baseAmount = payAmount;
        const commission = Math.ceil(baseAmount * 0.05);
        const totalToDeduct = baseAmount + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية شاملة النسبة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const transid = Date.now().toString().slice(-8);
            const serviceType = activeTab === 'internet' ? 'adsl' : 'line';
            
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    amount: baseAmount, 
                    action: 'bill',
                    service: 'post',
                    type: serviceType,
                    transid: transid,
                })
            });
            const result = await response.json();
            
            const isSuccess = result.resultCode === "0" || result.resultCode === 0;
            const isPending = result.resultCode === "-2" || result.resultCode === -2;

            if (!response.ok || (!isSuccess && !isPending)) {
                throw new Error(result.message || 'فشلت عملية السداد.');
            }
            
            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: totalToDeduct,
                transactionType: `سداد ${typeLabel}`,
                notes: `إلى رقم: ${phone}. تشمل النسبة: ${commission} ر.ي. الحالة: ${isPending ? 'قيد التنفيذ' : 'ناجحة'}`,
                recipientPhoneNumber: phone,
                transid: transid
            });
            await batch.commit();
            
            setLastTxDetails({
                type: `سداد ${typeLabel}`,
                phone: phone,
                amount: totalToDeduct,
                transid: transid
            });
            setShowSuccess(true);
        } catch (error: any) {
            toast({ variant: "destructive", title: "فشل السداد", description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirmingPayment(false);
        }
    };

    if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ السداد..." />;

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
                                <p className="text-sm text-muted-foreground mt-1">تم قبول وتنفيذ طلب السداد</p>
                            </div>

                            <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم العملية:</span>
                                    <span className="font-mono font-black text-primary">{lastTxDetails.transid}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> رقم الهاتف:</span>
                                    <span className="font-mono font-bold tracking-widest">{lastTxDetails.phone}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" /> نوع الخدمة:</span>
                                    <span className="font-bold">{lastTxDetails.type}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> الإجمالي المخصوم:</span>
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
            <SimpleHeader title="الثابت والإنترنت الأرضي" />
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
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم الهاتف (0xxxxxxx)</Label>
                        {isSearching && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                    </div>
                    <Input
                        type="tel"
                        placeholder="0xxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 focus-visible:ring-primary transition-all"
                    />
                </div>

                {phone.length === 8 && phone.startsWith('0') && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                        {queryResult && (
                            <div className="bg-mesh-gradient rounded-3xl overflow-hidden shadow-lg p-1 animate-in zoom-in-95">
                                <div className="bg-white/10 backdrop-blur-md rounded-[22px] grid grid-cols-3 text-center text-white">
                                    <div className="p-3 border-l border-white/10">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">الرصيد المتبقي</p>
                                        <p className="text-sm font-black">{queryResult.balance}</p>
                                    </div>
                                    <div className="p-3 border-l border-white/10">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">قيمة الباقة</p>
                                        <p className="text-sm font-black">{queryResult.packagePrice} ر.ي</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">تاريخ الانتهاء</p>
                                        <p className="text-sm font-black">{queryResult.expireDate}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Tabs defaultValue="internet" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-primary/5">
                                <TabsTrigger value="internet" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الإنترنت الأرضي</TabsTrigger>
                                <TabsTrigger value="landline" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الهاتف الثابت</TabsTrigger>
                            </TabsList>

                            <TabsContent value="internet" className="pt-2 animate-in fade-in-0 duration-300">
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
                                        onClick={handleOpenConfirm} 
                                        disabled={!amount}
                                    >
                                        تسديد الآن
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="landline" className="pt-2 animate-in fade-in-0 duration-300">
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
                                        onClick={handleOpenConfirm} 
                                        disabled={!amount}
                                    >
                                        تسديد الآن
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            <AlertDialog open={isConfirmingPayment} onOpenChange={setIsConfirmingPayment}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد السداد</AlertDialogTitle>
                        <div className="space-y-3 pt-4 text-right text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">رقم الهاتف:</span>
                                <span className="font-bold">{phone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">مبلغ الفاتورة:</span>
                                <span className="font-bold">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة:</span>
                                <span className="font-bold text-orange-600">{Math.ceil(parseFloat(amount || '0') * 0.05).toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">إجمالي الخصم:</span>
                                <span className="font-black text-primary text-lg">{(parseFloat(amount || '0') + Math.ceil(parseFloat(amount || '0') * 0.05)).toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction className="w-full rounded-2xl h-12 font-bold" onClick={() => handlePayment(parseFloat(amount), activeTab === 'internet' ? 'إنترنت (ADSL)' : 'هاتف ثابت')}>تأكيد</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Toaster />
        </div>
    );
}
