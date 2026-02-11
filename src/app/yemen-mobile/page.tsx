
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
  RefreshCw, 
  Smile, 
  Frown, 
  Zap, 
  ShieldCheck, 
  Database, 
  ChevronDown,
  Globe,
  Mail,
  Phone as PhoneIcon,
  Clock,
  AlertCircle
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type BillingInfo = {
    balance: number;
    customer_type: string;
    resultDesc?: string;
    isLoan: boolean;
    loanAmount?: number;
};

type ActiveOffer = {
    offerName: string;
    startDate: string;
    expireDate: string;
};

type Offer = {
    offerName: string;
    offerId: string;
    price: number;
    data?: string;
    sms?: string;
    minutes?: string;
    validity?: string;
    offertype: string; 
};

const CATEGORIES = [
  {
    id: 'mazaya',
    title: 'باقات مزايا',
    badge: '3G',
    icon: ShieldCheck,
    offers: [
      { 
        offerId: 'm_monthly', 
        offerName: 'مزايا الشهرية', 
        price: 1300, 
        data: '250 MB', 
        sms: '350', 
        minutes: '350', 
        validity: 'شهر', 
        offertype: 'A38394' 
      },
      { 
        offerId: 'm_weekly', 
        offerName: 'مزايا الاسبوعة', 
        price: 485, 
        data: '90 MB', 
        sms: '30', 
        minutes: '100', 
        validity: 'اسبوع', 
        offertype: 'A64329' 
      },
      { 
        offerId: 'm_max', 
        offerName: 'مزايا ماكس الشهرية', 
        price: 2000, 
        data: '600 MB', 
        sms: '200', 
        minutes: '500', 
        validity: 'شهر', 
        offertype: 'A75328' 
      },
    ]
  },
  {
    id: '4g',
    title: 'باقات فورجي',
    badge: '4G',
    icon: Zap,
    offers: [
      { 
        offerId: '4g_4gb_net', 
        offerName: 'باقة نت فورجي 4 قيقا', 
        price: 2000, 
        data: '4GB', 
        sms: 'لا يوجد', 
        minutes: 'لا يوجد', 
        validity: 'شهر', 
        offertype: 'A88332' 
      },
      { 
        offerId: '4g_48h', 
        offerName: 'مزايا فورجي 48 ساعة', 
        price: 600, 
        data: '1GB', 
        sms: '100', 
        minutes: '50', 
        validity: '48 ساعة', 
        offertype: 'A88337' 
      },
      { 
        offerId: '4g_weekly', 
        offerName: 'مزايا فورجي الاسبوعية', 
        price: 1500, 
        data: '2GB', 
        sms: '300', 
        minutes: '200', 
        validity: 'اسبوع', 
        offertype: 'A88336' 
      },
      { 
        offerId: '4g_monthly', 
        offerName: 'مزايا فورجي الشهرية', 
        price: 2500, 
        data: '4GB', 
        sms: '350', 
        minutes: '300', 
        validity: 'شهر', 
        offertype: 'A88335' 
      },
    ]
  },
  {
    id: 'data',
    title: 'باقات النت',
    badge: 'Net',
    icon: Database,
    offers: [
      { offerId: 'net_500', offerName: 'نت 500 ميجا', price: 600, data: '500 MB', validity: '30 يوم', offertype: 'Net500' },
      { offerId: 'net_1gb', offerName: 'نت 1 جيجا', price: 1100, data: '1 GB', validity: '30 يوم', offertype: 'Net1GB' },
    ]
  }
];

const CustomLoader = () => (
  <div className="bg-card/90 p-4 rounded-3xl shadow-2xl flex items-center justify-center w-24 h-24 animate-in zoom-in-95 border border-white/10">
    <div className="relative w-12 h-12">
      <svg
        viewBox="0 0 50 50"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        <path
          d="M15 25 A10 10 0 0 0 35 25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M40 15 A15 15 0 0 1 40 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-30"
        />
      </svg>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="fixed inset-0 flex flex-col justify-center items-center z-[100] bg-black/20 backdrop-blur-sm">
    <CustomLoader />
  </div>
);

const PackageItemCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-accent/10 dark:bg-slate-900 rounded-2xl p-5 shadow-sm relative border border-primary/5 mb-3 text-center cursor-pointer hover:bg-accent/20 transition-all active:scale-[0.98]"
      onClick={onClick}
    >
      <h4 className="text-sm font-black text-primary mb-2">{offer.offerName}</h4>
      <div className="flex items-center justify-center mb-4">
        <span className="text-2xl font-black text-primary">
            {offer.price.toLocaleString('en-US')}
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-2 pt-3 mt-2 border-t border-primary/10 text-center">
        <div className="space-y-1.5">
            <Globe className="w-5 h-5 mx-auto text-primary" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.data || '-'}</p>
        </div>
        <div className="space-y-1.5">
            <Mail className="w-5 h-5 mx-auto text-primary" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.sms || '-'}</p>
        </div>
        <div className="space-y-1.5">
            <PhoneIcon className="w-5 h-5 mx-auto text-primary" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.minutes || '-'}</p>
        </div>
        <div className="space-y-1.5">
            <Clock className="w-5 h-5 mx-auto text-primary" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.validity || '-'}</p>
        </div>
      </div>
    </div>
);

export default function YemenMobilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState("balance");
  const [isSearching, setIsSearching] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [amount, setAmount] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActivatingOffer, setIsActivatingOffer] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<any>(userDocRef);

  useEffect(() => {
    if (phone.length === 9) {
      handleSearch();
    } else {
        setBillingInfo(null);
        setActiveOffers([]);
    }
  }, [phone]);

  const handleSearch = async () => {
    if (!phone || phone.length !== 9) return;
    setIsSearching(true);
    try {
      const queryResponse = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, action: 'query' }),
      });
      const queryResult = await queryResponse.json();

      const solfaResponse = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, action: 'solfa' }),
      });
      const solfaResult = await solfaResponse.json();

      if (queryResponse.ok) {
          let typeLabel = queryResult.mobileTy || '';
          if (typeLabel.includes('فوترة') || typeLabel.toLowerCase().includes('postpaid')) {
              typeLabel = 'فوترة';
          } else {
              typeLabel = 'دفع مسبق';
          }

          const isLoan = solfaResult.status === "1" || solfaResult.status === 1;
          const loanAmt = isLoan ? parseFloat(solfaResult.loan_amount || "0") : 0;

          setBillingInfo({ 
              balance: parseFloat(queryResult.balance || "0"), 
              customer_type: typeLabel,
              resultDesc: queryResult.resultDesc,
              isLoan: isLoan,
              loanAmount: loanAmt
          });
          
          const offerResponse = await fetch('/api/telecom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mobile: phone, action: 'queryoffer' }),
          });
          const offerResult = await offerResponse.json();
          if (offerResponse.ok && offerResult.offers) {
              const mappedOffers = offerResult.offers.map((off: any) => ({
                  offerName: off.offer_name || off.offerName,
                  startDate: off.start_date || off.startDate || '...',
                  expireDate: off.expire_date || off.expireDate || '...'
              }));
              setActiveOffers(mappedOffers);
          } else {
              setActiveOffers([]);
          }
      }
    } catch (e) {
        console.error("Search Error:", e);
    } finally {
        setIsSearching(false);
    }
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    if (val === 'packages' && phone.length === 9) {
        handleSearch();
    }
  };

  const handleRenewOffer = (name: string) => {
    const normalize = (str: string) => 
        str.replace(/[أإآ]/g, 'ا')
           .replace(/ة/g, 'ه')
           .replace(/ى/g, 'ي')
           .toLowerCase()
           .trim();

    const normalizedInput = normalize(name);

    let foundOffer: Offer | undefined;
    for (const cat of CATEGORIES) {
        foundOffer = cat.offers.find(o => {
            const normalizedOfferName = normalize(o.offerName);
            return normalizedInput.includes(normalizedOfferName) || normalizedOfferName.includes(normalizedInput);
        });
        if (foundOffer) break;
    }

    if (foundOffer) {
        setSelectedOffer(foundOffer);
    } else {
        toast({
            variant: "destructive",
            title: "عذراً",
            description: "لم نتمكن من تحديد سعر التجديد لهذه الباقة تلقائياً. يرجى اختيارها من القائمة بالأسفل.",
        });
    }
  };

  const handlePayment = async () => {
    if (!phone || !amount || !user || !userDocRef || !firestore) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const loanAmt = billingInfo?.isLoan ? (billingInfo.loanAmount || 0) : 0;
    const totalToDeduct = val + loanAmt;

    if ((userProfile?.balance ?? 0) < totalToDeduct) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لإتمام العملية شاملة السلفة.' });
        return;
    }

    setIsProcessing(true);
    try {
        const transid = Date.now().toString();
        const response = await fetch('/api/telecom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: phone, amount: val, action: 'bill', transid })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'فشلت عملية السداد.');

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-totalToDeduct) });
        batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid, 
            transactionDate: new Date().toISOString(), 
            amount: totalToDeduct,
            transactionType: 'سداد يمن موبايل', 
            notes: `إلى رقم: ${phone}. مبلغ السداد: ${val}${loanAmt > 0 ? ` + سلفة: ${loanAmt}` : ''}.`, 
            recipientPhoneNumber: phone
        });
        await batch.commit();
        setShowSuccess(true);
    } catch (e: any) {
        toast({ variant: "destructive", title: "فشل السداد", description: e.message });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  const handleActivateOffer = async () => {
    if (!selectedOffer || !phone || !user || !userDocRef || !firestore) return;
    
    const loanAmt = billingInfo?.isLoan ? (billingInfo.loanAmount || 0) : 0;
    const totalToDeduct = selectedOffer.price + loanAmt;

    if ((userProfile?.balance ?? 0) < totalToDeduct) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لتفعيل هذه الباقة شاملة السلفة.' });
        return;
    }

    setIsActivatingOffer(true);
    try {
        const transid = Date.now().toString();
        const response = await fetch('/api/telecom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: phone, action: 'billover', offertype: selectedOffer.offertype, transid })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'فشل تفعيل الباقة.');

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-totalToDeduct) });
        batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid, transactionDate: new Date().toISOString(), amount: totalToDeduct,
            transactionType: `تفعيل ${selectedOffer.offerName}`, notes: `للرقم: ${phone}${loanAmt > 0 ? ` شامل سلفة: ${loanAmt}` : ''}`, recipientPhoneNumber: phone
        });
        await batch.commit();
        toast({ title: 'تم التفعيل', description: 'تم تفعيل الباقة بنجاح' });
        setSelectedOffer(null);
        handleSearch();
    } catch (e: any) {
        toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
        setIsActivatingOffer(false);
    }
  };

  const loanAmountToAdd = billingInfo?.isLoan ? (billingInfo.loanAmount || 0) : 0;

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <SimpleHeader title="يمن موبايل" />
      
      {isSearching && activeTab === 'packages' && <LoadingSpinner />}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Banner Image */}
        <div className="overflow-hidden rounded-3xl shadow-sm bg-white dark:bg-slate-900 flex items-center justify-center border border-primary/5 animate-in fade-in-0 duration-700">
            <Image
                src="https://i.postimg.cc/V6YjZwsz/Photo-Room-20230331-185039.png"
                alt="Yemen Mobile Banner"
                width={600}
                height={300}
                className="w-full h-auto object-contain max-h-48 p-4"
            />
        </div>

        <Card className="overflow-hidden rounded-[28px] shadow-lg bg-mesh-gradient text-white border-none mb-4">
            <CardContent className="p-6 flex items-center justify-between">
                <div className="text-right">
                    <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                    <div className="flex items-baseline gap-1">
                        <h2 className="text-2xl font-black text-white">
                            {userProfile?.balance?.toLocaleString('en-US') || '0'}
                        </h2>
                        <span className="text-sm font-bold text-white/80">ريال يمني</span>
                    </div>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl">
                    <Wallet className="h-6 w-6 text-white" />
                </div>
            </CardContent>
        </Card>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-primary/5">
            <div className="flex justify-between items-center mb-2 px-1">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم الجوال</Label>
                {isSearching && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </div>
            <Input
                type="tel"
                placeholder="77xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 focus-visible:ring-primary transition-all"
            />
        </div>

        {phone.length === 9 && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-primary/5">
                    <TabsTrigger value="packages" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الباقات</TabsTrigger>
                    <TabsTrigger value="balance" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الرصيد</TabsTrigger>
                </TabsList>

                <TabsContent value="packages" className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                    {!billingInfo && isSearching ? (
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full rounded-3xl" />
                            <Skeleton className="h-40 w-full rounded-3xl" />
                        </div>
                    ) : (
                        <>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-primary/5">
                            <div className="grid grid-cols-3 text-center border-b bg-muted/10">
                                <div className="p-3 border-l">
                                    <p className="text-[10px] font-bold text-primary mb-1">رصيد الرقم</p>
                                    <p className="text-sm font-black text-primary">
                                        {billingInfo?.balance.toLocaleString('en-US') || '0.00'}
                                    </p>
                                </div>
                                <div className="p-3 border-l">
                                    <p className="text-[10px] font-bold text-primary mb-1">نوع الرقم</p>
                                    <p className="text-sm font-black text-primary">{billingInfo?.customer_type || '...'}</p>
                                </div>
                                <div className="p-3">
                                    <p className="text-[10px] font-bold text-primary mb-1">فحص السلفة</p>
                                    <div className="flex items-center justify-center gap-1">
                                        {billingInfo?.isLoan ? (
                                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 px-1.5 h-6">
                                                <Frown className="h-3 w-3" />
                                                <span className="text-[9px] font-black">
                                                    {billingInfo.loanAmount?.toLocaleString('en-US')} ريال
                                                </span>
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 h-6">
                                                <Smile className="h-3 w-3" />
                                                <span className="text-[9px] font-black">غير متسلف</span>
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-primary/5">
                            <div className="bg-primary p-3 text-center">
                                <h3 className="text-white font-black text-sm">الاشتراكات الحالية</h3>
                            </div>
                            <div className="p-4 space-y-4">
                                {activeOffers.length > 0 ? (
                                    activeOffers.map((off, idx) => (
                                        <div key={idx} className="flex gap-4 items-center p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-primary/5 mb-3 text-right animate-in fade-in-0 slide-in-from-bottom-2">
                                            <div className="flex flex-col items-center justify-center">
                                                <button 
                                                    onClick={() => handleRenewOffer(off.offerName)}
                                                    className="bg-primary p-4 rounded-[20px] shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-1 min-w-[70px]"
                                                >
                                                    <RefreshCw className="w-6 h-6 text-white" />
                                                    <span className="text-[10px] text-white font-bold">تجديد</span>
                                                </button>
                                            </div>

                                            <div className="flex-1">
                                                <h4 className="text-sm font-black text-[#002B5B] dark:text-primary-foreground leading-tight">
                                                    {off.offerName}
                                                </h4>
                                                <p className="text-[10px] font-bold text-muted-foreground mt-1">باقة نشطة حالياً</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6">
                                        <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground font-bold">لا توجد باقات نشطة حالياً</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Accordion type="single" collapsible className="w-full space-y-3">
                            {CATEGORIES.map((cat) => (
                                <AccordionItem key={cat.id} value={cat.id} className="border-none">
                                    <AccordionTrigger className="px-4 py-4 bg-primary rounded-2xl text-white hover:no-underline shadow-md group data-[state=open]:rounded-b-none">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="bg-white text-primary font-black text-xs px-3 py-1 rounded-xl shadow-inner">
                                                {cat.badge}
                                            </div>
                                            <span className="text-sm font-black flex-1 mr-4 text-right">{cat.title}</span>
                                            <ChevronDown className="w-5 h-5 text-white/70 group-data-[state=open]:rotate-180 transition-transform" />
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-white dark:bg-slate-900 border-x border-b border-primary/10 rounded-b-2xl shadow-sm">
                                        {cat.offers.map((o) => (
                                            <PackageItemCard key={o.offerId} offer={o} onClick={() => setSelectedOffer(o)} />
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="balance" className="pt-4 space-y-6 animate-in fade-in-0">
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
                        
                        {amount && (
                            <div className="mt-4 animate-in fade-in-0 slide-in-from-top-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">الرصيد بعد الضريبة</p>
                                <p className="text-xl font-black text-primary">
                                    {(parseFloat(amount) * 0.826).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        )}

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
        )}
      </div>

      <Toaster />

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[32px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black">تأكيد سداد رصيد</AlertDialogTitle>
                <div className="space-y-3 pt-4 text-right text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground">رقم الهاتف:</span>
                        <span className="font-bold">{phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground">المبلغ المكتوب:</span>
                        <span className="font-bold">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span>
                    </div>
                    {billingInfo?.isLoan && (
                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                            <span className="text-muted-foreground">مبلغ السلفة:</span>
                            <span className="font-bold text-destructive">{billingInfo.loanAmount?.toLocaleString('en-US')} ريال</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                        <span className="font-black">إجمالي الخصم:</span>
                        <span className="font-black text-primary text-lg">
                            {(parseFloat(amount || '0') + loanAmountToAdd).toLocaleString('en-US')} ريال
                        </span>
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
                  <AlertDialogTitle className="text-center font-black">تأكيد تفعيل الباقة</AlertDialogTitle>
                  <div className="py-4 space-y-3 text-right text-sm">
                      <p className="text-center text-lg font-black text-primary mb-2">{selectedOffer?.offerName}</p>
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                          <span className="text-muted-foreground">سعر الباقة:</span>
                          <span className="font-bold">{selectedOffer?.price.toLocaleString('en-US')} ريال</span>
                      </div>
                      {billingInfo?.isLoan && (
                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                            <span className="text-muted-foreground">مبلغ السلفة:</span>
                            <span className="font-bold text-destructive">{billingInfo.loanAmount?.toLocaleString('en-US')} ريال</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2">
                        <span className="font-black">إجمالي الخصم:</span>
                        <p className="text-3xl font-black text-primary">
                            {((selectedOffer?.price || 0) + loanAmountToAdd).toLocaleString('en-US')} <span className="text-sm">ريال</span>
                        </p>
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
    </div>
  );
}
