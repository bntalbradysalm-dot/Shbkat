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

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type QueryResult = {
    balance?: string;
    resultDesc?: string;
    status?: string;
};

type InternetPackage = {
    id: string;
    name: string;
    price: number;
    speed: string;
    description: string;
};

const INTERNET_PACKAGES: InternetPackage[] = [
    { id: 'adsl_1m', name: 'إنترنت 1 ميجا', price: 1100, speed: '1 Mbps', description: 'باقة منزلية اقتصادية' },
    { id: 'adsl_2m', name: 'إنترنت 2 ميجا', price: 2100, speed: '2 Mbps', description: 'باقة منزلية سريعة' },
    { id: 'adsl_4m', name: 'إنترنت 4 ميجا', price: 4100, speed: '4 Mbps', description: 'باقة مميزة للعائلات' },
    { id: 'adsl_8m', name: 'إنترنت 8 ميجا', price: 8100, speed: '8 Mbps', description: 'باقة فائقة السرعة' },
    { id: 'fiber_20m', name: 'فايبر 20 ميجا', price: 15000, speed: '20 Mbps', description: 'تقنية الألياف الضوئية' },
    { id: 'fiber_40m', name: 'فايبر 40 ميجا', price: 28000, speed: '40 Mbps', description: 'أعلى سرعة ممكنة' },
];

const PackageCard = ({ pkg, onClick }: { pkg: InternetPackage, onClick: () => void }) => (
    <div 
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-primary/5 mb-3 text-right cursor-pointer hover:bg-primary/5 transition-all active:scale-[0.98] group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
          <div className="bg-primary/10 text-primary font-black text-[10px] px-2 py-1 rounded-lg flex items-center gap-1">
            <Globe className="w-3 h-3" /> ADSL
          </div>
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{pkg.name}</h4>
      </div>
      
      <div className="flex items-baseline gap-1 justify-end mb-3">
        <span className="text-xl font-black text-primary">{pkg.price.toLocaleString()}</span>
        <span className="text-[10px] font-bold text-muted-foreground">ريال</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/5">
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-1.5 rounded-xl text-center">
            <p className="text-[10px] font-bold">{pkg.speed}</p>
        </div>
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-1.5 rounded-xl text-center">
            <p className="text-[10px] font-bold">30 يوم</p>
        </div>
      </div>
    </div>
);

export default function LandlineRedesignPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('0');
    const [activeTab, setActiveTab] = useState("internet");
    const [isSearching, setIsSearching] = useState(false);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [amount, setAmount] = useState('');
    const [selectedPackage, setSelectedPackage] = useState<InternetPackage | null>(null);
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
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
        if (phone.length !== 8) {
            setQueryResult(null);
        }
    }, [phone]);

    const handleSearch = async () => {
        if (!phone || phone.length !== 8) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم هاتف صحيح مكون من 8 أرقام' });
            return;
        }
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
            
            setQueryResult({
                balance: result.balance || '0.00',
                resultDesc: result.resultDesc || 'نشط',
                status: 'متصل'
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: error.message });
        } finally {
            setIsSearching(false);
        }
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
            const transid = Date.now().toString();
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
                recipientPhoneNumber: phone
            });
            await batch.commit();
            setShowSuccess(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل السداد', description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirmingPayment(false);
            setSelectedPackage(null);
        }
    };

    const formatDisplayValue = (val: string | undefined) => {
        if (!val) return '0.00';
        const cleanVal = val.toString().toLowerCase();
        
        if (cleanVal.includes('gb') || cleanVal.includes('mb') || cleanVal.includes('ريال')) {
            return val;
        }

        const num = parseFloat(val);
        if (isNaN(num)) return val;

        if (activeTab === 'internet') {
            if (num > 100) {
                if (num >= 1024) return `${(num / 1024).toFixed(2)} GB`;
                return `${num.toFixed(2)} MB`;
            }
            if (num > 0 && num < 100) return `${num.toFixed(2)} GB`;
        }

        return `${num.toLocaleString('en-US')} ريال`;
    };

    if (isProcessing) return <ProcessingOverlay message="جاري معالجة طلبك..." />;

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
                            <h2 className="text-2xl font-black text-green-600">تمت العملية بنجاح</h2>
                            <p className="text-sm text-muted-foreground">تم تنفيذ طلبك للرقم {phone} بنجاح.</p>
                            <Button className="w-full h-14 rounded-2xl font-bold text-lg" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
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
                
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-primary/5">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم الهاتف (مع الصفر)</Label>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Input
                            type="tel"
                            placeholder="0xxxxxxx"
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val === '' || val.startsWith('0')) {
                                    setPhone(val.slice(0, 8));
                                }
                            }}
                            className="text-center font-bold text-2xl h-14 rounded-2xl border-none bg-muted/20 focus-visible:ring-primary transition-all tracking-widest"
                        />
                        {phone.length === 8 && (
                            <Button 
                                onClick={handleSearch} 
                                disabled={isSearching}
                                className="h-12 rounded-2xl font-bold animate-in slide-in-from-top-2 fade-in-0"
                            >
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Search className="w-5 h-5 ml-2" />}
                                {activeTab === 'internet' ? 'استعلام عن الانترنت' : 'استعلام عن الثابت'}
                            </Button>
                        )}
                    </div>
                </div>

                {phone.length === 8 && phone.startsWith('0') ? (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                        {queryResult && (
                            <div className="bg-mesh-gradient rounded-3xl overflow-hidden shadow-lg p-1 animate-in zoom-in-95">
                                <div className="bg-white/10 backdrop-blur-md rounded-[22px] grid grid-cols-2 text-center text-white">
                                    <div className="p-4 border-l border-white/10">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">
                                            {activeTab === 'internet' ? 'البيانات المتبقية' : 'المديونية/الرصيد'}
                                        </p>
                                        <p className="text-base font-black">{formatDisplayValue(queryResult.balance)}</p>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-[10px] font-bold opacity-80 mb-1حالة الخط</p>
                                        <div className="flex items-center justify-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            <p className="text-sm font-black">{queryResult.resultDesc}</p>
                                        </div>
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
                                <div className="grid grid-cols-1 gap-1">
                                    {INTERNET_PACKAGES.map((pkg) => (
                                        <PackageCard 
                                            key={pkg.id} 
                                            pkg={pkg} 
                                            onClick={() => setSelectedPackage(pkg)} 
                                        />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="landline" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-primary/5 text-center">
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Phone className="w-8 h-8 text-primary" />
                                    </div>
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">أدخل مبلغ سداد الهاتف الثابت</Label>
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
                                        onClick={() => setIsConfirmingPayment(true)} 
                                        disabled={!amount}
                                    >
                                        تسديد الآن
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="bg-primary/5 p-6 rounded-[40px] animate-pulse">
                            <Activity className="w-12 h-12 text-primary/20" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black text-muted-foreground">بانتظار إدخال الرقم</p>
                            <p className="text-[10px] text-muted-foreground/60 font-bold">يجب أن يبدأ الرقم بـ 0 ويتكون من 8 أرقام</p>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={isConfirmingPayment} onOpenChange={setIsConfirmingPayment}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                            <Wallet className="w-8 h-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-center font-black">تأكيد السداد</AlertDialogTitle>
                        <div className="space-y-3 pt-4 text-right text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">رقم الهاتف:</span>
                                <span className="font-bold">{phone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">مبلغ الفاتورة:</span>
                                <span className="font-bold">{amount} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة:</span>
                                <span className="font-bold text-orange-600">{Math.ceil(parseFloat(amount || '0') * 0.05)} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">إجمالي الخصم:</span>
                                <span className="font-black text-primary text-lg">{parseFloat(amount || '0') + Math.ceil(parseFloat(amount || '0') * 0.05)} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-3 mt-6">
                        <AlertDialogCancel className="flex-1 rounded-2xl h-12">إلغاء</AlertDialogCancel>
                        <AlertDialogAction className="flex-1 rounded-2xl h-12 font-bold" onClick={() => handlePayment(parseFloat(amount), 'هاتف ثابت')}>تأكيد</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                            <Zap className="w-8 h-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-center font-black">تأكيد تفعيل الباقة</AlertDialogTitle>
                        <div className="py-4 space-y-3 text-right text-sm">
                            <p className="text-center text-lg font-black text-primary mb-2">{selectedPackage?.name}</p>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">سعر التفعيل:</span>
                                <span className="font-bold">{selectedPackage?.price.toLocaleString()} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة:</span>
                                <span className="font-bold text-orange-600">{Math.ceil((selectedPackage?.price || 0) * 0.05)} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">الإجمالي المطلوب:</span>
                                <span className="font-black text-primary text-lg">{(selectedPackage?.price || 0) + Math.ceil((selectedPackage?.price || 0) * 0.05)} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-3 mt-6">
                        <AlertDialogCancel className="flex-1 rounded-2xl h-12">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={() => selectedPackage && handlePayment(selectedPackage.price, selectedPackage.name)} className="flex-1 rounded-2xl h-12 font-bold">تفعيل</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Toaster />
        </div>
    );
}
