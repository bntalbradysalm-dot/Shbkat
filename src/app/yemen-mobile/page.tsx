'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, Phone, CheckCircle, Wifi, Zap, Loader2, ChevronDown, RefreshCcw, Globe, Mail, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type UserProfile = {
  balance?: number;
};

type BillingInfo = {
    balance: number;
    customer_type: string;
    solfa_status: 'متسلف' | 'غير متسلف' | 'غير معروف';
};

type Offer = {
    offerName: string;
    offerId: string;
    price: number;
    data?: string;
    sms?: string;
    minutes?: string;
    validity?: string;
};

const CATEGORIES = [
  {
    id: 'mazaya',
    title: 'باقات مزايا',
    badge: '3G',
    offers: [
      { offerId: 'm1200', offerName: 'مزايا الشهرية 1200', price: 1200, data: '250 ميجا', sms: '150 رسالة', minutes: '300 دقيقة', validity: '30 يوم' },
      { offerId: 'm2500', offerName: 'مزايا الشهرية 2500', price: 2500, data: '1 جيجا', sms: '300 رسالة', minutes: '600 دقيقة', validity: '30 يوم' },
      { offerId: 'm5000', offerName: 'مزايا الشهرية 5000', price: 5000, data: '2.5 جيجا', sms: '600 رسالة', minutes: '1200 دقيقة', validity: '30 يوم' },
      { offerId: 'm_weekly', offerName: 'مزايا الإسبوعية', price: 485, data: '90 ميجا', sms: '30 رسالة', minutes: '100 دقيقة', validity: '7 أيام' },
    ]
  },
  {
    id: '4g',
    title: 'باقات فورجي',
    badge: '4G',
    offers: [
      { offerId: '4g_5gb', offerName: 'فورجي 5 جيجابايت', price: 2400, data: '5 جيجا', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم' },
      { offerId: '4g_10gb', offerName: 'فورجي 10 جيجابايت', price: 4400, data: '10 جيجا', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم' },
      { offerId: '4g_20gb', offerName: 'فورجي 20 جيجابايت', price: 8000, data: '20 جيجا', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم' },
      { offerId: '4g_unlimited', offerName: 'فورجي بلا حدود', price: 15000, data: 'بلا حدود', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم' },
    ]
  },
  {
    id: 'volte',
    title: 'باقات فولتي VoLTE',
    badge: '4G',
    offers: [
      { offerId: 'volte_100', offerName: 'فولتي 100 دقيقة', price: 500, data: '0 ميجا', sms: '0 رسالة', minutes: '100 دقيقة', validity: '30 يوم' },
      { offerId: 'volte_300', offerName: 'فولتي 300 دقيقة', price: 1200, data: '0 ميجا', sms: '0 رسالة', minutes: '300 دقيقة', validity: '30 يوم' },
      { offerId: 'volte_500', offerName: 'فولتي 500 دقيقة', price: 2000, data: '0 ميجا', sms: '0 رسالة', minutes: '500 دقيقة', validity: '30 يوم' },
    ]
  },
  {
    id: 'monthly_net',
    title: 'باقات الإنترنت الشهرية',
    badge: '⇅',
    offers: [
      { offerId: 'net_1gb', offerName: 'إنترنت 1 جيجابايت', price: 1000, data: '1 جيجا', sms: '0 رسالة', minutes: '0 دقيقة', validity: '30 يوم' },
      { offerId: 'net_3gb', offerName: 'إنترنت 3 جيجابايت', price: 2500, data: '3 جيجا', sms: '0 رسالة', minutes: '0 دقيقة', validity: '30 يوم' },
      { offerId: 'net_6gb', offerName: 'إنترنت 6 جيجابايت', price: 4500, data: '6 جيجا', sms: '0 رسالة', minutes: '0 دقيقة', validity: '30 يوم' },
    ]
  },
  {
    id: '10days_net',
    title: 'باقات الإنترنت 10 أيام',
    badge: '⇅',
    offers: [
      { offerId: 'net_10d_500', offerName: 'إنترنت 500 ميجا', price: 400, data: '500 ميجا', sms: '0 رسالة', minutes: '0 دقيقة', validity: '10 أيام' },
      { offerId: 'net_10d_1500', offerName: 'إنترنت 1.5 جيجا', price: 1000, data: '1.5 جيجا', sms: '0 رسالة', minutes: '0 دقيقة', validity: '10 أيام' },
    ]
  },
];

const MOCK_ACTIVE_SUBS = [
    { name: 'تفعيل خدمة الانترنت - شريحة (3G)', start: '2022-12-23 17:17:50', end: '2037-01-01 00:00:00' },
    { name: 'باقة 450 ميجابايت شريحة', start: '2026-01-15 16:29:31', end: '2026-02-13 23:59:59', highlight: true },
    { name: 'مزايا الشهرية - 350 دقيقة 150 رسالة 250 ميجا', start: '2026-02-02 17:22:52', end: '2026-03-03 23:59:59' },
];

const BalanceDisplay = () => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
    const isLoading = isUserLoading || isProfileLoading;

    return (
        <Card className="shadow-md border-none rounded-3xl bg-mesh-gradient text-white">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="font-medium opacity-80 text-xs uppercase tracking-widest">رصيدك الحالي</p>
                    {isLoading ? (
                        <Skeleton className="h-8 w-32 mt-2 bg-white/20" />
                    ) : (
                        <p className="text-3xl font-black mt-1">{(userProfile?.balance ?? 0).toLocaleString('en-US')} <span className="text-sm font-normal">ريال</span></p>
                    )}
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <Wallet className="h-8 w-8" />
                </div>
            </CardContent>
        </Card>
    );
}

const PackageCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => {
  return (
    <div 
      className="bg-[#FDE6D2] rounded-[24px] p-4 shadow-sm relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer border border-[#EBCDB5] mb-3"
      onClick={onClick}
    >
      {/* Floating Logo */}
      <div className="absolute top-3 left-3 w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center p-1 border border-white">
        <Image src="https://i.postimg.cc/tTXzYWY3/1200x630wa.jpg" alt="Logo" width={24} height={24} className="rounded-md object-contain" />
      </div>

      <div className="text-right pr-1">
        <h4 className="text-base font-black text-[#8B1D3D] leading-tight">{offer.offerName}</h4>
        <p className="text-xs font-bold text-slate-800 mt-0.5">دفع مسبق</p>
        <p className="text-[9px] font-bold text-slate-500">شريحة + برمجة</p>
      </div>

      <div className="flex justify-center my-2">
        <span className="text-3xl font-black text-slate-400 opacity-20 drop-shadow-sm tracking-tighter">{offer.price}</span>
      </div>

      <div className="grid grid-cols-4 gap-0 pt-3 border-t border-[#EBCDB5] text-center">
        <div className="space-y-0.5">
          <Globe className="w-3 h-3 mx-auto text-[#8B1D3D]" />
          <p className="text-[8px] font-black text-slate-800">{offer.data || '-'}</p>
        </div>
        <div className="space-y-0.5 border-r border-[#EBCDB5]">
          <Mail className="w-3 h-3 mx-auto text-[#8B1D3D]" />
          <p className="text-[8px] font-black text-slate-800">{offer.sms || '-'}</p>
        </div>
        <div className="space-y-0.5 border-r border-[#EBCDB5]">
          <Phone className="w-3 h-3 mx-auto text-[#8B1D3D]" />
          <p className="text-[8px] font-black text-slate-800">{offer.minutes || '-'}</p>
        </div>
        <div className="space-y-0.5 border-r border-[#EBCDB5]">
          <Clock className="w-3 h-3 mx-auto text-[#8B1D3D]" />
          <p className="text-[8px] font-black text-slate-800">{offer.validity || '-'}</p>
        </div>
      </div>
    </div>
  );
};

export default function YemenMobilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [phone, setPhone] = useState('');
  const [showTabs, setShowTabs] = useState(false);
  const [isCheckingBilling, setIsCheckingBilling] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isConfirmingOffer, setIsConfirmingOffer] = useState(false);
  const [isActivatingOffer, setIsActivatingOffer] = useState(false);

  const [amount, setAmount] = useState('');
  const [netAmount, setNetAmount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (showSuccess && audioRef.current) {
      audioRef.current.play().catch(e => {});
    }
  }, [showSuccess]);

  useEffect(() => {
    const handleSearch = async () => {
      if (phone.length === 9 && (phone.startsWith('77') || phone.startsWith('78'))) {
        setShowTabs(true);
        setIsCheckingBilling(true);
        setBillingInfo(null);
        
        try {
          const [balanceRes, solfaRes] = await Promise.all([
            fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, action: 'query' }),
            }),
            fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, action: 'solfa' }),
            })
          ]);

          const balanceResult = await balanceRes.json();
          const solfaResult = await solfaRes.json();

          if (!balanceRes.ok) throw new Error(balanceResult.message || 'فشل الاستعلام عن الرصيد.');

          let finalSolfaStatus: BillingInfo['solfa_status'] = 'غير معروف';
          if (solfaRes.ok && solfaResult.status) {
            finalSolfaStatus = solfaResult.status === '1' ? 'متسلف' : 'غير متسلف';
          }
  
          setBillingInfo({
            balance: parseFloat(balanceResult.balance || balanceResult.availableCredit || "0"),
            customer_type: balanceResult.mobileTy || balanceResult.mobileType || 'غير معروف',
            solfa_status: finalSolfaStatus
          });

        } catch (error: any) {
          toast({ variant: "destructive", title: "تنبيه", description: error.message });
        } finally {
          setIsCheckingBilling(false);
        }
      } else {
        setShowTabs(false);
        setBillingInfo(null);
      }
    };
    
    const timerId = setTimeout(handleSearch, 800);
    return () => clearTimeout(timerId);
  }, [phone, toast]);

  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      setNetAmount(numericAmount - (numericAmount * 0.174));
    } else {
      setNetAmount(0);
    }
  }, [amount]);

  const handlePayment = async () => {
    if (!phone || !amount || !user || !userProfile || !firestore || !userDocRef) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات غير مكتملة.' });
        return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 21) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'أقل مبلغ للسداد هو 21 ريال.' });
        return;
    }

    if ((userProfile.balance ?? 0) < numericAmount) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام العملية.' });
        return;
    }

    setIsProcessing(true);

    try {
        const transid = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const response = await fetch('/api/telecom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mobile: phone,
                amount: numericAmount,
                action: 'bill',
                transid: transid,
            })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشلت عملية السداد.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-numericAmount) });
        const transactionRef = doc(firestoreCollection(firestore, 'users', user.uid, 'transactions'));
        batch.set(transactionRef, {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: numericAmount,
            transactionType: `سداد رصيد وباقات`,
            notes: `إلى رقم: ${phone}. مرجع: ${result.sequenceId || transid}`,
            recipientPhoneNumber: phone
        });
        await batch.commit();
        setShowSuccess(true);
    } catch (error: any) {
        toast({ variant: "destructive", title: "فشل العملية", description: error.message });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };
  
  const handleOfferClick = (offer: Offer) => {
      setSelectedOffer(offer);
      setIsConfirmingOffer(true);
  };

  const handleActivateOffer = async () => {
      if (!selectedOffer || !phone) return;
      
      setIsActivatingOffer(true);
      try {
          const response = await fetch('/api/telecom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  mobile: phone,
                  action: 'billover',
                  offertype: selectedOffer.offerId,
                  method: 'New',
                  solfa: 'N'
              })
          });

          const result = await response.json();
          if (!response.ok) {
              throw new Error(result.message || 'فشل تفعيل الباقة.');
          }

          toast({
              title: "تم إرسال الطلب",
              description: `جاري تفعيل باقة "${selectedOffer.offerName}" بنجاح.`
          });

      } catch (error: any) {
          toast({ variant: "destructive", title: "خطأ", description: error.message });
      } finally {
          setIsActivatingOffer(false);
          setIsConfirmingOffer(false);
          setSelectedOffer(null);
      }
  };

  const formatCustomerType = (type: string | undefined) => {
    if (!type) return '...';
    const t = type.toString().toLowerCase();
    if (t === 'prepaid' || t === '0') return 'دفع مسبق';
    if (t === 'postpaid' || t === '1') return 'فوترة';
    return type;
  };

  if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ السداد..." />;
  
  if (showSuccess) {
    return (
        <>
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px]">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center justify-center gap-6">
                            <div className="bg-green-100 p-5 rounded-full"><CheckCircle className="h-16 w-16 text-green-600" /></div>
                            <div className='space-y-2'>
                                <h2 className="text-2xl font-black">تم السداد بنجاح</h2>
                                <p className="text-sm text-muted-foreground">تم سداد مبلغ {Number(amount).toLocaleString('en-US')} ريال بنجاح.</p>
                            </div>
                            <Button className="w-full h-12 rounded-2xl font-bold text-lg" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <SimpleHeader title="خدمات يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />
        
        <Card className="shadow-lg border-none rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-primary/5 pb-4">
             <CardTitle className="text-center text-lg font-black text-primary flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" />
                سداد رصيد وباقات
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className='space-y-2'>
              <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground px-1">
                ادخل رقم الهاتف
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode='numeric'
                placeholder="77xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="text-center font-black text-2xl h-14 rounded-2xl border-2 focus-visible:ring-primary bg-muted/30"
              />
            </div>
            
            {showTabs && (
                <div className="pt-2 animate-in fade-in-0 duration-500">
                    <Tabs defaultValue="packages" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-2xl h-12 p-1">
                             <TabsTrigger value="packages" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">الباقات</TabsTrigger>
                             <TabsTrigger value="balance" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">الرصيد</TabsTrigger>
                        </TabsList>

                        <TabsContent value="packages" className="pt-6 space-y-6">
                            {/* Billing Summary Info */}
                            <Card className="bg-[#fffbeb] border-2 border-amber-100 rounded-3xl shadow-sm">
                                <CardContent className="grid grid-cols-3 gap-2 p-3 text-center">
                                    <div className='p-2 bg-white/50 rounded-2xl border border-amber-50'>
                                        <p className="text-[10px] text-amber-700 font-bold mb-1">رصيد الرقم</p>
                                        {isCheckingBilling ? <Skeleton className="h-5 w-12 mx-auto mt-1" /> : <p className="font-black text-xs text-amber-900">{(billingInfo?.balance ?? 0).toLocaleString()} ريال</p>}
                                    </div>
                                    <div className='p-2 bg-white/50 rounded-2xl border border-amber-50'>
                                        <p className="text-[10px] text-amber-700 font-bold mb-1">نوع الرقم</p>
                                        {isCheckingBilling ? <Skeleton className="h-5 w-12 mx-auto mt-1" /> : <p className="font-black text-xs text-amber-900">{formatCustomerType(billingInfo?.customer_type)}</p>}
                                    </div>
                                     <div className='p-2 bg-white/50 rounded-2xl border border-amber-50'>
                                        <p className="text-[10px] text-amber-700 font-bold mb-1">فحص السلفة</p>
                                        {isCheckingBilling ? <Skeleton className="h-5 w-12 mx-auto mt-1" /> : <p className={cn("font-black text-xs", billingInfo?.solfa_status === 'متسلف' ? 'text-destructive' : 'text-green-600')}>{billingInfo?.solfa_status ?? '...'}</p>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Active Subscriptions Section */}
                            <Card className="border shadow-sm rounded-2xl overflow-hidden bg-white">
                                <div className="bg-primary px-4 py-2 text-center">
                                    <h4 className="text-white text-sm font-black tracking-widest">الاشتراكات الحالية</h4>
                                </div>
                                <CardContent className="p-0 divide-y divide-muted">
                                    {MOCK_ACTIVE_SUBS.map((sub, idx) => (
                                        <div key={idx} className={cn("p-4 flex items-center justify-between gap-4", sub.highlight ? "bg-orange-50" : "")}>
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="p-2 bg-primary/10 rounded-xl">
                                                    <RefreshCcw className="w-5 h-5 text-primary" />
                                                </div>
                                                <span className="text-[10px] font-bold text-primary">تجديد</span>
                                            </div>
                                            <div className="flex-1 text-right">
                                                <h5 className="text-xs font-black text-slate-800 leading-tight mb-2">{sub.name}</h5>
                                                <div className="space-y-0.5">
                                                    <div className="flex justify-start gap-2 text-[10px]">
                                                        <span className="text-green-600 font-bold">الاشتراك:</span>
                                                        <span className="font-mono text-slate-500">{sub.start}</span>
                                                    </div>
                                                    <div className="flex justify-start gap-2 text-[10px]">
                                                        <span className="text-destructive font-bold">الانتهاء:</span>
                                                        <span className="font-mono text-slate-500">{sub.end}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            
                            {/* Categories Accordion */}
                            <div className="space-y-2">
                                <Accordion type="single" collapsible className="w-full space-y-3">
                                  {CATEGORIES.map((category) => (
                                    <AccordionItem key={category.id} value={category.id} className="border-none">
                                      <AccordionTrigger className="px-5 py-5 text-sm hover:no-underline bg-primary rounded-2xl shadow-md transition-all active:scale-[0.98] group flex-row-reverse [&[data-state=open]]:rounded-b-none">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                                                <span className="text-primary font-black text-xs">{category.badge}</span>
                                            </div>
                                            <span className="text-white font-black text-right flex-1 text-base tracking-wide">{category.title}</span>
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-white/80 transition-transform group-data-[state=open]:rotate-180 ml-auto" />
                                      </AccordionTrigger>
                                      <AccordionContent className="p-4 space-y-2 bg-white border-x border-b rounded-b-2xl shadow-inner">
                                        {category.offers.map((offer) => (
                                          <PackageCard 
                                            key={offer.offerId} 
                                            offer={offer} 
                                            onClick={() => handleOfferClick(offer)} 
                                          />
                                        ))}
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                            </div>
                        </TabsContent>

                        <TabsContent value="balance" className="pt-6 space-y-6">
                           <div className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor="amount" className="text-xs font-bold text-muted-foreground px-1">المبلغ المراد تسديده</Label>
                                    <Input 
                                        id="amount" 
                                        type="number" 
                                        inputMode='numeric' 
                                        placeholder="0.00" 
                                        value={amount} 
                                        onChange={(e) => setAmount(e.target.value)} 
                                        className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-2" 
                                    />
                                </div>
                                <div className='p-4 bg-primary/5 border border-primary/10 rounded-2xl flex justify-between items-center'>
                                    <span className="text-sm font-bold text-slate-600 tracking-tight">صافي الرصيد المستلم:</span>
                                    <span className="text-lg font-black text-primary">{netAmount.toFixed(2)} <span className="text-xs">ر.ي</span></span>
                                </div>
                           </div>

                           <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                                <AlertDialogTrigger asChild>
                                <Button className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20" disabled={isProcessing || !amount || !phone}>
                                    <Send className="ml-2 h-5 w-5" />
                                    تأكيد عملية التسديد
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[32px]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-center text-xl font-black">تأكيد السداد</AlertDialogTitle>
                                    <AlertDialogDescription className="text-center pt-4 text-slate-700 space-y-2">
                                        <p>أنت على وشك تسديد مبلغ</p>
                                        <p className="font-black text-2xl text-primary tracking-tight">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</p>
                                        <p>إلى الرقم <span className="font-black text-slate-900">{phone}</span></p>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-3 mt-6">
                                    <AlertDialogCancel className="flex-1 rounded-2xl h-12" disabled={isProcessing}>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePayment} className="flex-1 rounded-2xl h-12 font-bold" disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="animate-spin h-5 w-5"/> : 'تأكيد'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    <Toaster />

    <AlertDialog open={isConfirmingOffer} onOpenChange={setIsConfirmingOffer}>
        <AlertDialogContent className="rounded-[32px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center text-xl font-black">تأكيد تفعيل الباقة</AlertDialogTitle>
                <AlertDialogDescription className='text-center pt-6 text-slate-700 space-y-3'>
                    <div className="p-4 bg-muted/50 rounded-2xl">
                        <p className="text-xs text-muted-foreground mb-1">الباقة المختارة:</p>
                        <p className="font-black text-lg text-primary">{selectedOffer?.offerName}</p>
                    </div>
                    <p>سيتم تفعيل هذه الباقة للرقم <span className="font-black text-slate-900">{phone}</span></p>
                    <p className="text-xs text-destructive font-bold">سيتم خصم قيمة الباقة من رصيدك الحالي.</p>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 mt-6">
                <AlertDialogCancel className="flex-1 rounded-2xl h-12" disabled={isActivatingOffer}>تراجع</AlertDialogCancel>
                <AlertDialogAction onClick={handleActivateOffer} className="flex-1 rounded-2xl h-12 font-bold" disabled={isActivatingOffer}>
                    {isActivatingOffer ? <Loader2 className="ml-2 h-5 w-5 animate-spin"/> : 'تفعيل الآن'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
