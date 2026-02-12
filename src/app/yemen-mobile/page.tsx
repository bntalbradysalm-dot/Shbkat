'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Globe,
  Mail,
  Phone as PhoneIcon,
  Clock,
  AlertCircle,
  Hash,
  Calendar,
  History,
  Smartphone
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

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

const HADAYA_OFFERS: Offer[] = [
  { offerId: 'h_monthly', offerName: 'هدايا الشهرية', price: 1500, data: '400MB', sms: '100', minutes: '400', validity: 'شهر', offertype: 'A68329' },
  { offerId: 'h_weekly', offerName: 'هدايا الاسبوعية', price: 600, data: '250MB', sms: '250', minutes: '50', validity: 'اسبوع', offertype: 'A44330' },
  { offerId: 'h_tawfeer', offerName: 'هدايا توفير', price: 250, data: '120MB', sms: '10', minutes: '70', validity: '4 ايام', offertype: 'A66328' },
  { offerId: 'h_max', offerName: 'هدايا ماكس الشهرية', price: 3000, data: '1GB', sms: '300', minutes: '1000', validity: 'شهر', offertype: 'A76328' },
];

const CATEGORIES = [
  {
    id: 'mazaya',
    title: 'باقات مزايا',
    badge: '3G',
    icon: ShieldCheck,
    offers: [
      { offerId: 'm_monthly', offerName: 'مزايا الشهرية', price: 1300, data: '250 MB', sms: '350', minutes: '350', validity: '30 يوم', offertype: 'A38394' },
      { offerId: 'm_weekly', offerName: 'مزايا الاسبوعة', price: 485, data: '90 MB', sms: '30', minutes: '100', validity: '7 أيام', offertype: 'A64329' },
      { offerId: 'm_max', offerName: 'مزايا ماكس الشهرية', price: 2000, data: '600 MB', sms: '200', minutes: '500', validity: '30 يوم', offertype: 'A75328' },
    ]
  },
  {
    id: '4g_mazaya',
    title: 'باقات مزايا فورجي',
    badge: '4G',
    icon: Zap,
    offers: [
      { offerId: 'super_4g', offerName: 'سوبر فورجي', price: 2000, data: '3GB', sms: '250', minutes: '250', validity: '30 يوم', offertype: 'A5533822' },
      { offerId: '4g_24h', offerName: 'مزايا فورجي 24 ساعة', price: 300, data: '512MB', sms: '30', minutes: '20', validity: '24 ساعة', offertype: 'A4826' },
      { offerId: '4g_48h', offerName: 'مزايا فورجي 48 ساعة', price: 600, data: '1GB', sms: '100', minutes: '50', validity: '48 ساعة', offertype: 'A88337' },
      { offerId: '4g_weekly', offerName: 'مزايا فورجي الاسبوعية', price: 1500, data: '2GB', sms: '300', minutes: '200', validity: '7 أيام', offertype: 'A88336' },
      { offerId: 'm_tawfeer', offerName: 'مزايا توفير الشهرية', price: 2400, data: '4GB', sms: '450', minutes: '450', validity: '30 يوم', offertype: 'A3823' },
      { offerId: '4g_monthly', offerName: 'مزايا فورجي الشهرية', price: 2500, data: '4GB', sms: '350', minutes: '300', validity: '30 يوم', offertype: 'A88335' },
      { offerId: 'm_max_4g', offerName: 'مزايا ماكس فورجي', price: 4000, data: '4GB', sms: '600', minutes: '1100', validity: '30 يوم', offertype: 'A88441' },
    ]
  },
  {
    id: '4g_net',
    title: 'باقات نت فورجي',
    badge: '4G',
    icon: Database,
    offers: [
      { offerId: 'net_4g_4gb', offerName: 'نت فورجي 4 قيقا', price: 2000, data: '4GB', validity: '30 يوم', offertype: 'A4821' },
      { offerId: 'net_tawfeer_weekly', offerName: 'نت توفير الاسبوعية', price: 1125, data: '3GB', validity: '7 أيام', offertype: 'A3435' },
      { offerId: 'net_tawfeer_monthly', offerName: 'نت توفير الشهرية', price: 2250, data: '6GB', validity: '30 يوم', offertype: 'A3436' },
      { offerId: 'net_tawfeer_5gb', offerName: 'نت توفير 5 قيقا', price: 2300, data: '5GB', validity: '30 يوم', offertype: 'A3825' },
    ]
  },
  {
    id: 'monthly_net',
    title: 'باقات الانترنت الشهرية',
    badge: 'Net',
    icon: Globe,
    offers: [
      { offerId: 'net_3g_1gb', offerName: 'باقة 1 جيجا شهرية', price: 1400, data: '1GB', validity: '30 يوم', offertype: 'A300068' },
      { offerId: 'net_3g_2gb', offerName: 'باقة 2 جيجا شهرية', price: 2600, data: '2GB', validity: '30 يوم', offertype: 'A300069' },
      { offerId: 'net_3g_4gb', offerName: 'باقة 4 جيجا شهرية', price: 4800, data: '4GB', validity: '30 يوم', offertype: 'A300070' },
      { offerId: 'net_3g_6gb', offerName: 'باقة 6 جيجا شهرية', price: 7000, data: '6GB', validity: '30 يوم', offertype: 'A300073' },
      { offerId: 'net_3g_12gb', offerName: 'باقة 12 جيجا شهرية', price: 13000, data: '12GB', validity: '30 يوم', offertype: 'A300074' },
    ]
  },
  {
    id: '10day_net',
    title: 'باقات الإنترنت 10 ايام',
    badge: '10',
    icon: Clock,
    offers: [
      { offerId: 'net_10d_500mb', offerName: 'نت 500 ميجا 10 ايام', price: 600, data: '500MB', validity: '10 ايام', offertype: 'A300071' },
      { offerId: 'net_10d_1gb', offerName: 'نت 1 جيجا 10 ايام', price: 1000, data: '1GB', validity: '10 ايام', offertype: 'A300072' },
    ]
  }
];

const PackageItemCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-accent/10 dark:bg-slate-900 rounded-2xl p-5 shadow-sm relative border border-primary/5 mb-3 text-center cursor-pointer hover:bg-accent/20 transition-all active:scale-[0.98]"
      onClick={onClick}
    >
      <h4 className="text-sm font-black text-primary mb-2">{offer.offerName}</h4>
      <div className="flex items-baseline justify-center mb-4" dir="ltr">
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
  const [activeTab, setActiveTab] = useState("packages");
  const [isSearching, setIsSearching] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [amount, setAmount] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActivatingOffer, setIsActivatingOffer] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTxDetails, setLastTxDetails] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);

  const parseTelecomDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 8) return null;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10) || "0");
    const minute = parseInt(dateStr.substring(10, 12) || "0");
    const second = parseInt(dateStr.substring(12, 14) || "0");
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatSubscriptionDate = (dateStr: string) => {
    const d = parseTelecomDate(dateStr);
    if (!d) return '...';
    return format(d, 'd MMMM yyyy', { locale: ar });
  };

  const formatExpiryDate = (dateStr: string) => {
    const d = parseTelecomDate(dateStr);
    if (!d) return '...';
    return `${format(d, 'd', { locale: ar })}/${format(d, 'MMMM', { locale: ar })}/${format(d, 'yyyy', { locale: ar })}`;
  };

  const handleSearch = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length !== 9) return;
    
    setIsSearching(true);
    setBillingInfo(null);
    setActiveOffers([]);

    try {
      const transid = Date.now().toString().slice(-8);
      
      const queryResponse = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phoneNumber, action: 'query', transid }),
      });
      const queryResult = await queryResponse.json();

      const solfaResponse = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phoneNumber, action: 'solfa', transid }),
      });
      const solfaResult = await solfaResponse.json();

      const offerResponse = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phoneNumber, action: 'queryoffer', transid }),
      });
      const offerResult = await offerResponse.json();

      if (queryResponse.ok) {
          let mappedOffers: ActiveOffer[] = [];
          if (offerResponse.ok && offerResult.offers) {
              mappedOffers = offerResult.offers.map((off: any) => ({
                  offerName: off.offerName || off.offer_name || '...',
                  startDate: off.offerStartDate || off.start_date || off.startDate || '...',
                  expireDate: off.offerEndDate || off.expire_date || off.expireDate || '...'
              }));
          }

          // Combined search for "Postpaid" or "فوترة" in ALL result fields for better accuracy
          const searchIn = (obj: any) => JSON.stringify(obj).toLowerCase();
          const combinedResults = searchIn(queryResult) + searchIn(offerResult) + searchIn(solfaResult);
          
          const isPostpaid = combinedResults.includes('فوترة') || 
                             combinedResults.includes('postpaid') || 
                             combinedResults.includes('post_paid') ||
                             combinedResults.includes('باقة فوترة');
                             
          const detectedTypeLabel = isPostpaid ? 'فوترة' : 'دفع مسبق';

          const isLoan = solfaResult.status === "1" || solfaResult.status === 1;
          const loanAmt = isLoan ? parseFloat(solfaResult.loan_amount || "0") : 0;

          setBillingInfo({ 
              balance: parseFloat(queryResult.balance || "0"), 
              customer_type: detectedTypeLabel,
              resultDesc: queryResult.resultDesc,
              isLoan: isLoan,
              loanAmount: loanAmt
          });
          
          setActiveOffers(mappedOffers);
      } else {
          throw new Error(queryResult.message || 'فشل الاستعلام من المزود.');
      }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: e.message });
    } finally {
        setIsSearching(false);
    }
  }, [toast]);

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 9);
    setPhone(cleaned);
    if (cleaned.length === 9 && (cleaned.startsWith('77') || cleaned.startsWith('78'))) {
        handleSearch(cleaned);
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
    const categoriesToSearch = billingInfo?.customer_type === 'فوترة' ? [...CATEGORIES, { id: 'h', offers: HADAYA_OFFERS }] : CATEGORIES;
    
    for (const cat of categoriesToSearch) {
        foundOffer = (cat as any).offers.find((o: Offer) => {
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
            description: "لم نتمكن من تحديد سعر التجديد تلقائياً. يرجى اختيار الباقة من القائمة.",
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
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية شاملة السلفة.' });
        return;
    }

    setIsProcessing(true);
    try {
        const transid = Date.now().toString().slice(-8);
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
            recipientPhoneNumber: phone,
            transid: transid
        });
        await batch.commit();
        
        setLastTxDetails({
            type: 'سداد رصيد يمن موبايل',
            phone: phone,
            amount: totalToDeduct,
            transid: transid
        });
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
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لتفعيل هذه الباقة شاملة السلفة.' });
        return;
    }

    setIsActivatingOffer(true);
    try {
        const transid = Date.now().toString().slice(-8);
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
            transactionType: `تفعيل ${selectedOffer.offerName}`, notes: `للرقم: ${phone}${loanAmt > 0 ? ` شامل سلفة: ${loanAmt}` : ''}`, recipientPhoneNumber: phone,
            transid: transid
        });
        await batch.commit();
        
        setLastTxDetails({
            type: `تفعيل ${selectedOffer.offerName}`,
            phone: phone,
            amount: totalToDeduct,
            transid: transid
        });
        setShowSuccess(true);
        setSelectedOffer(null);
        handleSearch(phone);
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
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        <Card className="overflow-hidden rounded-[28px] shadow-lg bg-mesh-gradient text-white border-none mb-4">
            <CardContent className="p-6 flex items-center justify-between">
                <div className="text-right">
                    <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                    <div className="flex items-baseline gap-1" dir="ltr">
                        <h2 className="text-2xl font-black text-white">
                            {userProfile?.balance?.toLocaleString('en-US') || '0'}
                        </h2>
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
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم الجوال</Label>
                {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            <div className="relative">
                <Input
                    type="tel"
                    placeholder="77xxxxxxx"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 focus-visible:ring-primary transition-all"
                />
            </div>
        </div>

        {phone.length === 9 && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                {/* Fixed Account Info Grid (Shows Account Balance, Type, and Loan) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-primary/5">
                    <div className="grid grid-cols-3 text-center border-b bg-muted/10">
                        <div className="p-3 border-l">
                            <p className="text-[10px] font-bold text-primary mb-1">رصيد الرقم</p>
                            {isSearching ? <Skeleton className="h-4 w-16 mx-auto" /> : (
                                <p className="text-sm font-black text-primary" dir="ltr">
                                    {billingInfo?.balance.toLocaleString('en-US') || '0.00'}
                                </p>
                            )}
                        </div>
                        <div className="p-3 border-l">
                            <p className="text-[10px] font-bold text-primary mb-1">نوع الرقم</p>
                            {isSearching ? <Skeleton className="h-4 w-16 mx-auto" /> : (
                                <p className="text-sm font-black text-primary">{billingInfo?.customer_type || '...'}</p>
                            )}
                        </div>
                        <div className="p-3">
                            <p className="text-[10px] font-bold text-primary mb-1">فحص السلفة</p>
                            {isSearching ? <Skeleton className="h-4 w-16 mx-auto" /> : (
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
                            )}
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-primary/5">
                        <TabsTrigger value="packages" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الباقات</TabsTrigger>
                        <TabsTrigger value="balance" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الرصيد</TabsTrigger>
                    </TabsList>

                    <TabsContent value="packages" className="space-y-4">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-primary/5">
                            <div className="bg-primary p-3 text-center">
                                <h3 className="text-white font-black text-sm">الاشتراكات الحالية</h3>
                            </div>
                            <div className="p-4 space-y-2">
                                {isSearching ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                    </div>
                                ) : activeOffers.length > 0 ? (
                                    activeOffers.map((off, idx) => (
                                        <div key={idx} className="flex gap-3 items-center p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-primary/5 mb-2 text-right animate-in fade-in-0 slide-in-from-bottom-2">
                                            <div className="flex flex-col items-center justify-center">
                                                <button 
                                                    onClick={() => handleRenewOffer(off.offerName)}
                                                    className="bg-primary p-2.5 rounded-xl shadow-md active:scale-95 transition-all flex flex-col items-center justify-center gap-1 min-w-[60px]"
                                                >
                                                    <RefreshCw className="w-4 h-4 text-white" />
                                                    <span className="text-[9px] text-white font-bold">تجديد</span>
                                                </button>
                                            </div>

                                            <div className="flex-1 space-y-1">
                                                <h4 className="text-xs font-black text-[#002B5B] dark:text-primary-foreground leading-tight">
                                                    {off.offerName}
                                                </h4>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-destructive/80">
                                                        <Clock className="w-3 h-3 text-destructive/60" />
                                                        <span className="text-[9px] font-bold">الانتهاء: {formatExpiryDate(off.expireDate)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Calendar className="w-3 h-3 text-primary/60" />
                                                        <span className="text-[9px] font-bold">الاشتراك: {formatSubscriptionDate(off.startDate)}</span>
                                                    </div>
                                                </div>
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
                            {CATEGORIES.map((cat) => {
                                let categoryTitle = cat.title;
                                let categoryOffers = cat.offers;
                                
                                if (cat.id === 'mazaya' && billingInfo?.customer_type === 'فوترة') {
                                    categoryTitle = 'باقات هدايا';
                                    categoryOffers = HADAYA_OFFERS;
                                }

                                return (
                                    <AccordionItem key={cat.id} value={cat.id} className="border-none">
                                        <AccordionTrigger className="px-4 py-4 bg-primary rounded-2xl text-white hover:no-underline shadow-md group data-[state=open]:rounded-b-none">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="bg-white text-primary font-black text-xs px-3 py-1 rounded-xl shadow-inner shrink-0">
                                                    {cat.badge}
                                                </div>
                                                <span className="text-sm font-black flex-1 mr-4 text-right">{categoryTitle}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 bg-white dark:bg-slate-900 border-x border-b border-primary/10 rounded-b-2xl shadow-sm">
                                            {categoryOffers.map((o) => (
                                                <PackageItemCard key={o.offerId} offer={o} onClick={() => setSelectedOffer(o)} />
                                            ))}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
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
                                <div className="mt-4 animate-in fade-in-0 slide-in-from-top-2 text-center">
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
            </div>
        )}
      </div>

      <Toaster />

      {showSuccess && lastTxDetails && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in-0 p-4">
            <audio autoPlay src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" />
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
                <div className="bg-green-500 p-8 flex justify-center">
                    <div className="bg-white/20 p-4 rounded-full animate-bounce">
                        <CheckCircle className="h-16 w-16 text-white" />
                    </div>
                </div>
                <CardContent className="p-8 space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-green-600">تمت العملية بنجاح</h2>
                        <p className="text-sm text-muted-foreground mt-1">تم قبول طلبك وتنفيذه فورياً</p>
                    </div>

                    <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                        <div className="flex justify-between items-center border-b border-muted pb-2">
                            <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم العملية:</span>
                            <span className="font-mono font-black text-primary">{lastTxDetails.transid}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-muted pb-2">
                            <span className="text-muted-foreground flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> رقم الجوال:</span>
                            <span className="font-mono font-bold tracking-widest">{lastTxDetails.phone}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-muted pb-2">
                            <span className="text-muted-foreground flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" /> نوع العملية:</span>
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
                        <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => router.push('/login')}>الرئيسية</Button>
                        <Button className="rounded-2xl h-12 font-bold" onClick={() => { setShowSuccess(false); handleSearch(phone); }}>تحديث</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

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
                        <span className="font-bold" dir="ltr">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span>
                    </div>
                    {billingInfo?.isLoan && (
                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                            <span className="text-muted-foreground">مبلغ السلفة:</span>
                            <span className="font-bold text-destructive" dir="ltr">{billingInfo.loanAmount?.toLocaleString('en-US')} ريال</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                        <span className="font-black">إجمالي الخصم:</span>
                        <span className="font-black text-primary text-lg" dir="ltr">
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
                          <span className="font-bold" dir="ltr">{selectedOffer?.price.toLocaleString('en-US')} ريال</span>
                      </div>
                      {billingInfo?.isLoan && (
                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                            <span className="text-muted-foreground">مبلغ السلفة:</span>
                            <span className="font-bold text-destructive" dir="ltr">{billingInfo.loanAmount?.toLocaleString('en-US')} ريال</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2">
                        <span className="font-black">إجمالي الخصم:</span>
                        <div className="flex items-baseline gap-1" dir="ltr">
                            <p className="text-3xl font-black text-primary">
                                {((selectedOffer?.price || 0) + loanAmountToAdd).toLocaleString('en-US')}
                            </p>
                            <span className="text-sm font-black text-primary">ريال</span>
                        </div>
                      </div>
                  </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                  <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0" disabled={isActivatingOffer}>تراجع</AlertDialogCancel>
                  <AlertDialogAction onClick={handleActivateOffer} className="w-full rounded-2xl h-12 font-bold" disabled={isActivatingOffer}>
                      تفعيل الآن
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
