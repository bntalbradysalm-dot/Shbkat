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
  CalendarDays,
  ArrowUpDown,
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
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
    id: '4g_mazaya',
    title: 'باقات مزايا فورجي',
    badge: '4G',
    icon: Zap,
    offers: [
      { 
        offerId: 'super_4g', 
        offerName: 'سوبر فورجي', 
        price: 2000, 
        data: '3GB', 
        sms: '250', 
        minutes: '250', 
        validity: 'شهر', 
        offertype: 'A5533822' 
      },
      { 
        offerId: '4g_24h', 
        offerName: 'مزايا فورجي 24 ساعة', 
        price: 300, 
        data: '512MB', 
        sms: '30', 
        minutes: '20', 
        validity: 'يوم', 
        offertype: 'A4826' 
      },
      { 
        offerId: '4g_48h', 
        offerName: 'مزايا فورجي 48 ساعة', 
        price: 600, 
        data: '1GB', 
        sms: '100', 
        minutes: '50', 
        validity: 'ساعة 48', 
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
        offerId: '4g_800sms', 
        offerName: 'مزايا فورجي 800 رسالة', 
        price: 1000, 
        data: 'لا يوجد', 
        sms: '800', 
        minutes: 'لا يوجد', 
        validity: 'شهر', 
        offertype: 'A31338' 
      },
      { 
        offerId: 'm_tawfeer', 
        offerName: 'مزايا توفير الشهرية', 
        price: 2400, 
        data: '4GB', 
        sms: '450', 
        minutes: '450', 
        validity: 'شهر', 
        offertype: 'A3823' 
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
      { 
        offerId: 'm_max_4g', 
        offerName: 'مزايا ماكس فورجي', 
        price: 4000, 
        data: '4GB', 
        sms: '600', 
        minutes: '1100', 
        validity: 'شهر', 
        offertype: 'A88441' 
      },
      { 
        offerId: 'm_business_4g', 
        offerName: 'مزايا أعمال فورجي', 
        price: 5000, 
        data: '6GB', 
        sms: '1000', 
        minutes: '1500', 
        validity: 'شهر', 
        offertype: 'A39053' 
      },
    ]
  },
  {
    id: '4g_net',
    title: 'باقات نت فورجي',
    badge: '4G',
    icon: Database,
    offers: [
      { offerId: 'net_4g_4gb', offerName: 'نت فورجي 4 قيقا', price: 2000, data: '4GB', validity: 'شهر', offertype: 'A4821' },
      { offerId: 'net_tawfeer_weekly', offerName: 'نت توفير الاسبوعية', price: 1125, data: '3GB', validity: 'شهر', offertype: 'A3435' },
      { offerId: 'net_tawfeer_monthly', offerName: 'نت توفير الشهرية', price: 2250, data: '6GB', validity: 'شهر', offertype: 'A3436' },
      { offerId: 'net_tawfeer_5gb', offerName: 'نت توفير 5 قيقا', price: 2300, data: '5GB', validity: 'شهر', offertype: 'A3825' },
      { offerId: 'net_tawfeer_7gb', offerName: 'نت توفير 7 قيقا', price: 3000, data: '7GB', validity: 'شهر', offertype: 'A3822' },
      { offerId: 'net_tawfeer_8gb', offerName: 'نت توفير 8 قيقا', price: 3900, data: '8GB', validity: 'شهر', offertype: 'A4828' },
      { offerId: 'net_tawfeer_11gb', offerName: 'نت توفير 11 قيقا', price: 4125, data: '11GB', validity: 'شهر', offertype: 'A34346' },
      { offerId: 'net_tawfeer_25gb', offerName: 'نت توفير 25 قيقا', price: 8830, data: '25GB', validity: 'يوم 40', offertype: 'A3347' },
      { offerId: 'net_tawfeer_20gb', offerName: 'نت توفير 20 قيقا', price: 9700, data: '20GB', validity: 'شهر', offertype: 'A4830' },
    ]
  },
  {
    id: 'internet_monthly',
    title: 'باقات الانترنت الشهرية',
    badge: 'Net',
    icon: ArrowUpDown,
    offers: [
      { offerId: 'net_3g_150mb', offerName: 'نت ثري جي 150 ميقا', price: 500, data: '150 ميجا', validity: 'شهر', offertype: 'A69329' },
      { offerId: 'net_3g_300mb', offerName: 'نت ثري جي 300 ميقا', price: 900, data: '300 ميجا', validity: 'شهر', offertype: 'A69330' },
      { offerId: 'net_3g_700mb', offerName: 'نت ثري جي 700 ميقا', price: 1800, data: '700 ميجا', validity: 'شهر', offertype: 'A69338' },
      { offerId: 'net_3g_1500mb', offerName: 'نت ثري جي 1500 ميقا', price: 3300, data: '1500 ميجا', validity: 'شهر', offertype: 'A69345' },
    ]
  },
  {
    id: 'internet_10days',
    title: 'باقات الإنترنت 10 ايام',
    badge: '10',
    icon: CalendarDays,
    offers: [
      { offerId: 'net_3g_1gb', offerName: 'نت ثري جي 1 قيقا', price: 1400, data: '1GB', validity: 'ايام 10', offertype: 'A74332' },
      { offerId: 'net_3g_2gb', offerName: 'نت ثري جي 2 قيقا', price: 2600, data: '2GB', validity: 'ايام 10', offertype: 'A74339' },
      { offerId: 'net_3g_4gb', offerName: 'نت ثري جي 4 قيقا', price: 4800, data: '4GB', validity: 'ايام 10', offertype: 'A44345' },
      { offerId: 'net_3g_6gb', offerName: 'نت ثري جي 6 قيقا', price: 6000, data: '6GB', validity: 'ايام 10', offertype: 'A74351' },
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

const PackageItemCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-accent/10 dark:bg-slate-900 rounded-2xl p-5 shadow-sm relative border border-primary/5 mb-3 text-center cursor-pointer hover:bg-accent/20 transition-all active:scale-[0.98]"
      onClick={onClick}
    >
      <h4 className="text-sm font-black text-primary mb-2">{offer.offerName}</h4>
      <div className="flex items-baseline justify-center gap-1 mb-4" dir="ltr">
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
            <p className="text-[11px] font-black text-foreground truncate">{offer.validity ? offer.validity.split(' ').reverse().join(' ') : '-'}</p>
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
  const [lastTxDetails, setLastTxDetails] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);

  const handleSearch = useCallback(async () => {
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

      const offerResponse = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, action: 'queryoffer' }),
      });
      const offerResult = await offerResponse.json();

      if (queryResponse.ok) {
          let detectedType = 'دفع مسبق';
          const mobileTy = (queryResult.mobileTy || '').toLowerCase();
          
          if (mobileTy.includes('فوترة') || mobileTy.includes('postpaid')) {
              detectedType = 'فوترة';
          }

          let mappedOffers: ActiveOffer[] = [];
          if (offerResponse.ok && offerResult.offers) {
              mappedOffers = offerResult.offers.map((off: any) => ({
                  offerName: off.offer_name || off.offerName,
                  startDate: off.start_date || off.startDate || '...',
                  expireDate: off.expire_date || off.expireDate || '...'
              }));
              
              if (detectedType === 'دفع مسبق') {
                  const hasPostpaidOffer = mappedOffers.some(off => 
                      off.offerName.toLowerCase().includes('فوترة') || 
                      off.offerName.toLowerCase().includes('postpaid')
                  );
                  if (hasPostpaidOffer) {
                      detectedType = 'فوترة';
                  }
              }
          }

          const isLoan = solfaResult.status === "1" || solfaResult.status === 1;
          const loanAmt = isLoan ? parseFloat(solfaResult.loan_amount || "0") : 0;

          setBillingInfo({ 
              balance: parseFloat(queryResult.balance || "0"), 
              customer_type: detectedType,
              resultDesc: queryResult.resultDesc,
              isLoan: isLoan,
              loanAmount: loanAmt
          });
          
          setActiveOffers(mappedOffers);
      }
    } catch (e) {
        console.error("Search Error:", e);
    } finally {
        setIsSearching(false);
    }
  }, [phone]);

  useEffect(() => {
    if (phone.length === 9) {
      if (!phone.startsWith('77') && !phone.startsWith('78')) {
          toast({
              variant: 'destructive',
              title: 'خطأ في الرقم',
              description: 'رقم يمن موبايل يجب أن يبدأ بـ 77 أو 78'
          });
          setBillingInfo(null);
          setActiveOffers([]);
          return;
      }
      handleSearch();
    } else {
        setBillingInfo(null);
        setActiveOffers([]);
    }
  }, [phone, toast, handleSearch]);

  useEffect(() => {
    if (showSuccess && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  }, [showSuccess]);

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

    if (!foundOffer && billingInfo?.customer_type === 'فوترة') {
        foundOffer = HADAYA_OFFERS.find(o => {
            const normalizedOfferName = normalize(o.offerName);
            return normalizedInput.includes(normalizedOfferName) || normalizedOfferName.includes(normalizedInput);
        });
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
        handleSearch();
    } catch (e: any) {
        toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
        setIsActivatingOffer(false);
    }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ السداد..." />;
  if (isActivatingOffer) return <ProcessingOverlay message="جاري تفعيل الباقة..." />;

  const loanAmountToAdd = billingInfo?.isLoan ? (billingInfo.loanAmount || 0) : 0;

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <SimpleHeader title="يمن موبايل" />
      
      {isSearching && activeTab === 'packages' && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/20 backdrop-blur-[2px]">
              <CustomLoader />
          </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
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

        {phone.length === 9 && (phone.startsWith('77') || phone.startsWith('78')) && (
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
                            <div className="p-4 space-y-2">
                                {activeOffers.length > 0 ? (
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
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Calendar className="w-3 h-3 text-primary/60" />
                                                        <span className="text-[9px] font-bold">الاشتراك: {off.startDate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-destructive/80">
                                                        <Clock className="w-3 h-3 text-destructive/60" />
                                                        <span className="text-[9px] font-bold">الانتهاء: {off.expireDate}</span>
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
                                            {categoryOffers.length > 0 ? (
                                                categoryOffers.map((o) => (
                                                    <PackageItemCard key={o.offerId} offer={o} onClick={() => setSelectedOffer(o)} />
                                                ))
                                            ) : (
                                                <p className="text-center py-4 text-xs text-muted-foreground">لا توجد باقات في هذه الفئة حالياً.</p>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
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
                        <Button className="rounded-2xl h-12 font-bold" onClick={handleSearch}>تحديث</Button>
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
                      تفعيل الآن
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
