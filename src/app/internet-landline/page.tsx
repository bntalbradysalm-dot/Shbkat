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
  Globe,
  ChevronLeft,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Users,
  Phone as PhoneIcon
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

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

// --- THEME CONSTANTS ---
const INTERNET_THEME = {
    primary: '#302C81',
    gradient: {
        backgroundColor: '#302C81',
        backgroundImage: `radial-gradient(at 0% 0%, #403AAB 0px, transparent 50%), radial-gradient(at 100% 100%, #221E5C 0px, transparent 50%)`
    }
};

const LANDLINE_THEME = {
    primary: '#F18312',
    gradient: {
        backgroundColor: '#F18312',
        backgroundImage: `radial-gradient(at 0% 0%, #FF9E3D 0px, transparent 50%), radial-gradient(at 100% 100%, #C76A00 0px, transparent 50%)`
    }
};

const INTERNET_PACKAGES = [
    {
        title: "1 ميجا",
        items: [
            { name: "10GB", price: 1575 },
            { name: "24GB", price: 3150 },
            { name: "100GB", price: 10500 },
        ]
    },
    {
        title: "2 ميجا",
        items: [
            { name: "24GB", price: 2520 },
            { name: "50GB", price: 4725 },
            { name: "188GB", price: 15750 },
        ]
    },
    {
        title: "4 ميجا",
        items: [
            { name: "66GB", price: 6930 },
            { name: "280GB", price: 26250 },
            { name: "480GB", price: 39900 },
        ]
    },
    {
        title: "8 ميجا",
        items: [
            { name: "120GB", price: 12600 },
            { name: "420GB", price: 39375 },
            { name: "720GB", price: 59850 },
        ]
    },
    {
        title: "سوبر شامل 2 ميجا",
        items: [
            { name: "28GB", price: 2900 },
            { name: "54GB", price: 5100 },
            { name: "192GB", price: 16100 },
        ]
    },
    {
        title: "سوبر شامل 4 ميجا",
        items: [
            { name: "70GB", price: 7300 },
            { name: "284GB", price: 26600 },
            { name: "485GB", price: 40300 },
        ]
    },
    {
        title: "سوبر شامل 8 ميجا",
        items: [
            { name: "124GB", price: 13000 },
            { name: "425GB", price: 39800 },
            { name: "725GB", price: 60200 },
        ]
    }
];

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

    const currentTheme = activeTab === 'internet' ? INTERNET_THEME : LANDLINE_THEME;

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

    useEffect(() => {
        setQueryResult(null);
    }, [activeTab]);

    const handleSearch = async () => {
        if (!phone || phone.length !== 8) return;
        
        if (!phone.startsWith('0')) {
            toast({ variant: 'destructive', title: 'خطأ في الرقم', description: 'رقم الثابت يجب أن يبدأ بـ 0' });
            return;
        }

        setIsSearching(true);
        setQueryResult(null);
        try {
            const searchType = activeTab === 'internet' ? 'adsl' : 'line';
            
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, action: 'query', service: 'post', type: searchType })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل الاستعلام من المصدر.');
            
            const raw = result.balance || result.resultDesc || '';
            let balanceResult = activeTab === 'internet' ? '0.00 GB' : '0 ريال';
            let price = '0';
            let expiry = '...';

            if (activeTab === 'internet') {
                const balMatch = raw.match(/(الرصيد المتبقي|رصيد الباقة):\s*([\d.]+)/i);
                if (balMatch) balanceResult = `${balMatch[2]} GB`;
                else if (!isNaN(parseFloat(raw)) && parseFloat(raw) > 0) balanceResult = `${parseFloat(raw).toLocaleString('en-US')} ريال`;
            } else {
                const billMatch = raw.match(/(إجمالي الفاتورة|المبلغ المستحق|الفاتورة|عليه|المبلغ|مبلغ الفاتورة الحالية|الفاتورة الحالية):\s*([\d.]+)/i);
                if (billMatch) {
                    balanceResult = `${parseFloat(billMatch[2]).toLocaleString('en-US')} ريال`;
                } else if (!isNaN(parseFloat(raw)) && parseFloat(raw) > 0) {
                    balanceResult = `${parseFloat(raw).toLocaleString('en-US')} ريال`;
                } else {
                    balanceResult = 'لا توجد متأخرات';
                }
            }

            const priceMatch = raw.match(/(قيمة الباقة|تأمين الهاتف|المبلغ):\s*([\d.]+)/i);
            if (priceMatch) price = priceMatch[2] || priceMatch[1];

            const dateMatch = raw.match(/(تأريخ الانتهاء|تاريخ الفاتورة):\s*(\d{4})[-]?(\d{2})[-]?(\d{2})/i);
            if (dateMatch) {
                expiry = `${parseInt(dateMatch[4])}/${parseInt(dateMatch[3])}/${dateMatch[2]}`;
            } else if (raw.match(/\d{4}\/\d{2}\/\d{2}/)) {
                expiry = raw.match(/\d{4}\/\d{2}\/\d{2}/)![0];
            }
            
            setQueryResult({ balance: balanceResult, packagePrice: price, expireDate: expiry, message: result.resultDesc });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: error.message });
        } finally {
            setIsSearching(false);
        }
    };

    const handleContactPick = async () => {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            toast({
                variant: "destructive",
                title: "غير مدعوم",
                description: "متصفحك لا يدعم الوصول لجهات الاتصال.",
            });
            return;
        }

        try {
            const props = ['tel'];
            const opts = { multiple: false };
            const contacts = await (navigator as any).contacts.select(props, opts);
            
            if (contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
                let selectedNumber = contacts[0].tel[0];
                selectedNumber = selectedNumber.replace(/[\s\-\(\)]/g, '');
                if (selectedNumber.startsWith('+967')) selectedNumber = selectedNumber.substring(4);
                if (selectedNumber.startsWith('00967')) selectedNumber = selectedNumber.substring(5);
                if (!selectedNumber.startsWith('0')) selectedNumber = '0' + selectedNumber;
                
                setPhone(selectedNumber.slice(0, 8));
            }
        } catch (err) {
            console.error("Contacts selection failed:", err);
        }
    };

    const handlePayment = async (payAmount: number, typeLabel: string) => {
        if (!phone || !user || !userDocRef || !firestore) return;

        const commission = Math.ceil(payAmount * 0.05);
        const totalToDeduct = payAmount + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية شاملة العمولة.' });
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
                    amount: payAmount, 
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
                notes: `إلى رقم: ${phone}. سداد: ${payAmount} + عمولة: ${commission}.`,
                recipientPhoneNumber: phone,
                transid: transid
            });
            await batch.commit();
            
            setLastTxDetails({ type: `سداد ${typeLabel}`, phone: phone, amount: totalToDeduct, transid: transid });
            setShowSuccess(true);
        } catch (error: any) {
            toast({ variant: "destructive", title: "فشل السداد", description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirmingPayment(false);
        }
    };

    if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ السداد..." />;
    if (isSearching) return <ProcessingOverlay message="جاري الاستعلام..." />;

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
                                    <span className="font-mono font-black" style={{ color: currentTheme.primary }}>{lastTxDetails.transid}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><PhoneIcon className="w-3.5 h-3.5" /> رقم الهاتف:</span>
                                    <span className="font-mono font-bold tracking-widest">{lastTxDetails.phone}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" /> نوع الخدمة:</span>
                                    <span className="font-bold">{lastTxDetails.type}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> المبلغ المخصوم:</span>
                                    <span className="font-black" style={{ color: currentTheme.primary }}>{lastTxDetails.amount.toLocaleString('en-US')} ريال</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> التاريخ:</span>
                                    <span className="text-[10px] font-bold">{format(new Date(), 'Pp', { locale: ar })}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="w-full h-14 rounded-2xl font-bold text-lg" onClick={() => router.push('/login')}>الرئيسية</Button>
                                <Button className="w-full h-14 rounded-2xl font-bold text-lg text-white" style={{ backgroundColor: currentTheme.primary }} onClick={() => { setShowSuccess(false); handleSearch(); }}>تحديث</Button>
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
                
                <Card className="overflow-hidden rounded-[28px] shadow-lg text-white border-none mb-4 transition-all duration-500" style={currentTheme.gradient}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="text-right">
                            <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-2xl font-black text-white">{userProfile?.balance?.toLocaleString('en-US') || '0'}</h2>
                                <span className="text-[10px] font-bold opacity-70 text-white mr-1">ريال يمني</span>
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
                    <div className="relative">
                        <Input
                            type="tel"
                            placeholder="0xxxxxxx"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 transition-all pr-12 pl-12"
                            style={{ outlineColor: currentTheme.primary }}
                        />
                        <button 
                            onClick={handleContactPick}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors"
                            style={{ color: currentTheme.primary }}
                            title="جهات الاتصال"
                        >
                            <Users className="h-5 w-5" />
                        </button>
                    </div>
                    {phone.length === 8 && phone.startsWith('0') && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <Button 
                                className="w-full h-12 rounded-2xl font-bold mt-4 shadow-sm text-white" 
                                onClick={handleSearch}
                                disabled={isSearching}
                                style={{ backgroundColor: currentTheme.primary }}
                            >
                                {isSearching ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Search className="ml-2 h-4 w-4" />}
                                استعلام
                            </Button>
                        </div>
                    )}
                </div>

                {phone.length === 8 && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                        {queryResult && (
                            <div className="rounded-3xl overflow-hidden shadow-lg p-1 animate-in zoom-in-95" style={currentTheme.gradient}>
                                <div className={cn(
                                    "bg-white/10 backdrop-blur-md rounded-[22px] text-center text-white min-h-[80px] flex items-center justify-center",
                                    activeTab === 'internet' ? "grid grid-cols-3" : "w-full py-4"
                                )}>
                                    {activeTab === 'internet' ? (
                                        <>
                                            <div className="p-3 border-l border-white/10 flex flex-col justify-center">
                                                <p className="text-[10px] font-bold opacity-80 mb-1">الرصيد المتبقي</p>
                                                <p className="text-sm font-black">{queryResult.balance}</p>
                                            </div>
                                            <div className="p-3 border-l border-white/10 flex flex-col justify-center">
                                                <p className="text-[10px] font-bold opacity-80 mb-1">قيمة الباقة</p>
                                                <p className="text-sm font-black">{queryResult.packagePrice} ر.ي</p>
                                            </div>
                                            <div className="p-3 flex flex-col justify-center">
                                                <p className="text-[10px] font-bold opacity-80 mb-1">تاريخ الانتهاء</p>
                                                <p className="text-sm font-black">{queryResult.expireDate}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="text-[10px] font-bold opacity-80 mb-1 uppercase tracking-widest">مبلغ الفاتورة الحالي</p>
                                            <p className="text-xl font-black">{queryResult.balance}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <Tabs defaultValue="internet" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-primary/5">
                                <TabsTrigger value="internet" className="rounded-xl font-bold text-sm data-[state=active]:bg-[#302C81] data-[state=active]:text-white transition-all">الإنترنت الأرضي</TabsTrigger>
                                <TabsTrigger value="landline" className="rounded-xl font-bold text-sm data-[state=active]:bg-[#F18312] data-[state=active]:text-white transition-all">الهاتف الثابت</TabsTrigger>
                            </TabsList>

                            <TabsContent value="internet" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-[#302C81]/5 text-center">
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">ادخل المبلغ</Label>
                                    <div className="relative max-w-[240px] mx-auto">
                                        <Input 
                                            type="number" 
                                            placeholder="0.00" 
                                            value={amount} 
                                            onChange={(e) => setAmount(e.target.value)} 
                                            className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none placeholder:text-[#302C81]/10 text-[#302C81]" 
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#302C81]/30 font-black text-sm">ر.ي</div>
                                    </div>
                                    <Button 
                                        className="w-full h-14 rounded-2xl text-lg font-black mt-8 shadow-lg shadow-[#302C81]/20 text-white" 
                                        onClick={() => setIsConfirmingPayment(true)} 
                                        disabled={!amount}
                                        style={{ backgroundColor: '#302C81' }}
                                    >
                                        تسديد الآن
                                    </Button>
                                </div>

                                {/* Internet Packages Section - Simple & Centered */}
                                <div className="mt-8 space-y-6 pb-10">
                                    <div className="flex items-center justify-center px-2">
                                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">فئات الانترنت</h3>
                                    </div>
                                    
                                    <Accordion type="single" collapsible className="w-full space-y-4">
                                        {INTERNET_PACKAGES.map((category, idx) => (
                                            <AccordionItem key={idx} value={`item-${idx}`} className="border-none">
                                                <AccordionTrigger className="px-5 py-5 bg-white dark:bg-slate-900 rounded-[24px] hover:no-underline shadow-md border border-[#302C81]/5 data-[state=open]:rounded-b-none data-[state=open]:shadow-lg transition-all duration-300 text-right group">
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="h-10 w-10 relative overflow-hidden rounded-2xl shadow-lg shadow-[#302C81]/20 group-data-[state=open]:scale-110 transition-transform border border-white/20">
                                                            <Image 
                                                                src="https://i.postimg.cc/ZRHzd8jN/FB-IMG-1768999572493.jpg" 
                                                                alt="Landline Logo" 
                                                                fill 
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-start">
                                                            <span className="text-[10px] font-bold text-muted-foreground opacity-70 uppercase tracking-widest leading-tight">فئات</span>
                                                            <span className="text-sm font-black text-foreground leading-tight">{category.title}</span>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-x border-b border-[#302C81]/10 rounded-b-[24px] p-3 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
                                                    {category.items.map((pkg, pIdx) => (
                                                        <div 
                                                            key={pIdx}
                                                            onClick={() => {
                                                                setAmount(String(pkg.price));
                                                                setIsConfirmingPayment(true);
                                                            }}
                                                            className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:bg-gradient-to-l hover:from-[#302C81]/5 hover:to-transparent transition-all cursor-pointer group/item border border-[#302C81]/5 hover:border-[#302C81]/20 relative overflow-hidden"
                                                        >
                                                            <div className="flex items-center gap-4 relative z-10">
                                                                <div className="h-9 w-9 rounded-xl bg-[#302C81]/5 flex items-center justify-center group-hover/item:bg-white group-hover/item:shadow-sm transition-all">
                                                                    <Globe className="w-4 h-4 text-[#302C81] opacity-60" />
                                                                </div>
                                                                <div className="flex flex-col items-start">
                                                                    <span className="text-sm font-black text-foreground group-hover/item:text-[#302C81] transition-colors">{pkg.name}</span>
                                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">High Performance</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 relative z-10">
                                                                <div className="text-left">
                                                                    <p className="text-xs font-bold text-muted-foreground line-through opacity-40 mb-[-4px]">{(pkg.price * 1.1).toFixed(0)}</p>
                                                                    <p className="text-lg font-black text-[#302C81] tracking-tighter">{pkg.price.toLocaleString('en-US')}<span className="text-[9px] font-bold mr-1">ر.ي</span></p>
                                                                </div>
                                                                <div className="h-8 w-8 rounded-full bg-[#302C81] flex items-center justify-center text-white shadow-lg shadow-[#302C81]/30 translate-x-4 opacity-0 group-hover/item:translate-x-0 group-hover/item:opacity-100 transition-all duration-300">
                                                                    <ArrowUpRight className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                            {/* Subtle Glow Effect */}
                                                            <div className="absolute top-0 right-0 w-24 h-full bg-[#302C81]/5 blur-2xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                                        </div>
                                                    ))}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </div>
                            </TabsContent>

                            <TabsContent value="landline" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-[#F18312]/5 text-center">
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">ادخل المبلغ</Label>
                                    <div className="relative max-w-[240px] mx-auto">
                                        <Input 
                                            type="number" 
                                            placeholder="0.00" 
                                            value={amount} 
                                            onChange={(e) => setAmount(e.target.value)} 
                                            className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none placeholder:text-[#F18312]/10 text-[#F18312]" 
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F18312]/30 font-black text-sm">ر.ي</div>
                                    </div>
                                    <Button 
                                        className="w-full h-14 rounded-2xl text-lg font-black mt-8 shadow-lg shadow-[#F18312]/20 text-white" 
                                        onClick={() => setIsConfirmingPayment(true)} 
                                        disabled={!amount}
                                        style={{ backgroundColor: '#F18312' }}
                                    >
                                        تسديد الآن
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            <Toaster />

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
                                <span className="text-muted-foreground">المبلغ:</span>
                                <span className="font-bold">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة (5%):</span>
                                <span className="font-bold text-orange-600">{Math.ceil(parseFloat(amount || '0') * 0.05).toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2">
                                <span className="font-black">إجمالي الخصم:</span>
                                <span className="font-black text-lg" style={{ color: currentTheme.primary }}>{(parseFloat(amount || '0') + Math.ceil(parseFloat(amount || '0') * 0.05)).toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction className="w-full rounded-2xl h-12 font-bold text-white" style={{ backgroundColor: currentTheme.primary }} onClick={() => handlePayment(parseFloat(amount), activeTab === 'internet' ? 'إنترنت (ADSL)' : 'هاتف ثابت')}>تأكيد</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Toaster />
        </div>
    );
}
