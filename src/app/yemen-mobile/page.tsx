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
  Smartphone,
  Users
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
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
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
    id?: string; 
};

const YEMEN_MOBILE_PRIMARY = '#B32C4C';
const YEMEN_MOBILE_GRADIENT = {
    backgroundColor: '#B32C4C',
    backgroundImage: `
        radial-gradient(at 0% 0%, #D14566 0px, transparent 50%),
        radial-gradient(at 100% 100%, #8A1F38 0px, transparent 50%)
    `
};

const PREPAID_CATEGORIES = [
  {
    id: 'mazaya',
    title: 'باقات مزايا',
    badge: '3G',
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
    offers: [
      { offerId: 'net_150mb', offerName: 'نت ثري جي 150 ميقا', price: 500, data: '150 ميجا', validity: 'شهر', offertype: 'A69329' },
      { offerId: 'net_300mb', offerName: 'نت ثري جي 300 ميقا', price: 900, data: '300 ميجا', validity: 'شهر', offertype: 'A69330' },
      { offerId: 'net_700mb', offerName: 'نت ثري جي 700 ميقا', price: 1800, data: '700 ميجا', validity: 'شهر', offertype: 'A69338' },
      { offerId: 'net_1500mb', offerName: 'نت ثري جي 1500 ميقا', price: 3300, data: '1500 ميجا', validity: 'شهر', offertype: 'A69345' },
    ]
  },
  {
    id: 'volte',
    title: 'باقات فولتي',
    badge: 'VoLTE',
    offers: [
      { offerId: 'volte_1d', offerName: 'مزايا فورجي يوم فولتي', price: 300, data: '512MB', minutes: '20', sms: '30', validity: 'يوم', offertype: 'A4826' },
      { offerId: 'volte_2d', offerName: 'مزايا فورجي يومين فولتي', price: 600, data: '1GB', minutes: '50', sms: '100', validity: 'يومين', offertype: 'A4990004' },
      { offerId: 'volte_7d', offerName: 'مزايا فورجي الاسبوعية فولتي', price: 1500, data: '2GB', minutes: '200', sms: '300', validity: 'اسبوع', offertype: 'A4990005' },
      { offerId: 'volte_30d', offerName: 'مزايا فورجي الشهرية فولتي', price: 2500, data: '4GB', minutes: '300', sms: '350', validity: 'شهر', offertype: 'A4990006' },
      { offerId: 'volte_call', offerName: 'باقة فولتي اتصال الشهرية', price: 1000, minutes: '500', sms: '200', validity: 'شهر', offertype: 'A33000' },
      { offerId: 'volte_save', offerName: 'باقة فولتي توفير الشهرية', price: 1300, data: '1GB', minutes: '450', sms: '150', validity: 'شهر', offertype: 'A32000' },
    ]
  }
];

const POSTPAID_CATEGORIES = [
  {
    id: 'hadiya',
    title: 'باقات هدايا فوترة',
    badge: 'Post',
    offers: [
      { offerId: 'h_monthly', offerName: 'هدايا الشهرية', price: 1500, data: '400MB', sms: '100', minutes: '400', validity: 'شهر', offertype: 'A68329' },
      { offerId: 'h_weekly', offerName: 'هدايا الاسبوعية', price: 600, data: '250MB', sms: '250', minutes: '50', validity: 'اسبوع', offertype: 'A44330' },
      { offerId: 'h_tawfeer', offerName: 'هدايا توفير', price: 250, data: '120MB', sms: '10', minutes: '70', validity: '4 ايام', offertype: 'A66328' },
      { offerId: 'h_max', offerName: 'هدايا ماكس الشهرية', price: 3000, data: '1GB', sms: '300', minutes: '1000', validity: 'شهر', offertype: 'A76328' },
    ]
  }
];

const PackageItemCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-[#fad9b2] rounded-3xl p-5 shadow-sm relative border border-[#B32C4C]/10 mb-3 text-center cursor-pointer hover:bg-[#B32C4C]/5 transition-all active:scale-[0.98] group"
      onClick={onClick}
    >
      <div className="flex justify-center mb-3">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md">
              <Image src="https://i.postimg.cc/tTXzYWY3/1200x630wa.jpg" alt="Yemen Mobile" fill className="object-cover" />
          </div>
      </div>
      <h4 className="text-sm font-black text-[#B32C4C] mb-1 group-hover:text-[#B32C4C]/80 transition-colors">{offer.offerName}</h4>
      <div className="flex items-baseline justify-center mb-4">
        <span className="text-2xl font-black text-foreground">{offer.price.toLocaleString('en-US')}</span>
      </div>
      
      <div className="grid grid-cols-4 gap-2 pt-3 mt-2 border-t border-[#B32C4C]/10 text-center">
        <div className="space-y-1.5"><Globe className="w-5 h-5 mx-auto text-[#B32C4C]" /><p className="text-[11px] font-black text-foreground truncate">{offer.data || '-'}</p></div>
        <div className="space-y-1.5"><Mail className="w-5 h-5 mx-auto text-[#B32C4C]" /><p className="text-[11px] font-black text-foreground truncate">{offer.sms || '-'}</p></div>
        <div className="space-y-1.5"><PhoneIcon className="w-5 h-5 mx-auto text-[#B32C4C]" /><p className="text-[11px] font-black text-foreground truncate">{offer.minutes || '-'}</p></div>
        <div className="space-y-1.5"><Clock className="w-5 h-5 mx-auto text-[#B32C4C]" /><p className="text-[11px] font-black text-foreground truncate">{offer.validity || '-'}</p></div>
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
  const [lineTypeTab, setLineTypeTab] = useState('prepaid');
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
  const sulfaAudioRef = useRef<HTMLAudioElement>(null);
  const noSulfaAudioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);

  const formatFullDateTime = (dateStr: string) => {
    if (!dateStr || dateStr.length < 8) return '...';
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day} - ${month} - ${year}`;
  };

  const handleSearch = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length !== 9) return;
    setIsSearching(true);
    setBillingInfo(null);
    setActiveOffers([]);

    try {
      const transid = Date.now().toString().slice(-8);
      const [queryRes, solfaRes, offerRes] = await Promise.all([
          fetch('/api/telecom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: phoneNumber, action: 'query', transid }) }),
          fetch('/api/telecom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: phoneNumber, action: 'solfa', transid }) }),
          fetch('/api/telecom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: phoneNumber, action: 'queryoffer', transid }) })
      ]);

      const qResult = await queryRes.json();
      const sResult = await solfaRes.json();
      const oResult = await offerRes.json();

      if (queryRes.ok && (qResult.resultCode === "0" || qResult.resultCode === 0)) {
          const isPostpaid = JSON.stringify(qResult).toLowerCase().includes('فوترة');
          setLineTypeTab(isPostpaid ? 'postpaid' : 'prepaid');
          
          const isLoan = sResult.status === "1" || sResult.status === 1;
          const loanAmt = isLoan ? parseFloat(sResult.loan_amount || "0") : 0;

          setBillingInfo({ 
              balance: parseFloat(qResult.balance || "0"), 
              customer_type: isPostpaid ? 'فوترة' : 'دفع مسبق',
              isLoan,
              loanAmount: loanAmt
          });

          if (oResult.offers) {
              setActiveOffers(oResult.offers.map((off: any) => ({
                  offerName: off.offerName || '...',
                  startDate: off.startDate || '...',
                  expireDate: off.expireDate || '...'
              })));
          }

          if (isLoan) sulfaAudioRef.current?.play().catch(() => {});
          else noSulfaAudioRef.current?.play().catch(() => {});
      } else {
          throw new Error(qResult.resultDesc || 'فشل الاستعلام من المزود.');
      }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'تنبيه', description: e.message });
    } finally {
        setIsSearching(false);
    }
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 9);
    setPhone(cleaned);
    if (cleaned.length === 9) {
        if (cleaned.startsWith('77') || cleaned.startsWith('78')) handleSearch(cleaned);
        else toast({ variant: 'destructive', title: 'خطأ', description: 'يجب أن يبدأ بـ 77 أو 78' });
    }
  };

  const handlePayment = async () => {
    if (!phone || !amount || !user || !userDocRef) return;
    setIsProcessing(true);
    try {
        const transid = Date.now().toString().slice(-8);
        const res = await fetch('/api/telecom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: phone, amount: parseFloat(amount), action: 'bill', transid }) });
        const result = await res.json();
        if (!res.ok || (result.resultCode !== "0" && result.resultCode !== 0)) throw new Error(result.resultDesc || 'فشل السداد.');

        const batch = writeBatch(firestore!);
        batch.update(userDocRef, { balance: increment(-parseFloat(amount)) });
        batch.set(doc(firestoreCollection(firestore!, 'users', user.uid, 'transactions')), { userId: user.uid, transactionDate: new Date().toISOString(), amount: parseFloat(amount), transactionType: 'سداد يمن موبايل', recipientPhoneNumber: phone, transid });
        await batch.commit();
        setLastTxDetails({ type: 'سداد رصيد', phone, amount: parseFloat(amount), transid });
        setShowSuccess(true);
    } catch (e: any) {
        toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  const handleActivateOffer = async () => {
    if (!selectedOffer || !phone || !user || !userDocRef) return;
    setIsActivatingOffer(true);
    try {
        const transid = Date.now().toString().slice(-8);
        const res = await fetch('/api/telecom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile: phone, action: 'billoffer', service: 'yemen', offerid: selectedOffer.offertype, amount: selectedOffer.price, transid }) });
        const result = await res.json();
        if (!res.ok || (result.resultCode !== "0" && result.resultCode !== 0)) throw new Error(result.resultDesc || 'فشل التفعيل.');

        const batch = writeBatch(firestore!);
        batch.update(userDocRef, { balance: increment(-selectedOffer.price) });
        batch.set(doc(firestoreCollection(firestore!, 'users', user.uid, 'transactions')), { userId: user.uid, transactionDate: new Date().toISOString(), amount: selectedOffer.price, transactionType: `تفعيل ${selectedOffer.offerName}`, recipientPhoneNumber: phone, transid });
        await batch.commit();
        setLastTxDetails({ type: `تفعيل ${selectedOffer.offerName}`, phone, amount: selectedOffer.price, transid });
        setShowSuccess(true);
        setSelectedOffer(null);
    } catch (e: any) {
        toast({ variant: "destructive", title: "خطأ", description: e.message });
    } finally {
        setIsActivatingOffer(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <audio ref={sulfaAudioRef} src="/sulfa.mp3" preload="auto" />
      <audio ref={noSulfaAudioRef} src="/nosulfa.mp3" preload="auto" />
      <audio ref={audioRef} src="/ashar.mp3" preload="auto" />

      <SimpleHeader title="يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card className="overflow-hidden rounded-[28px] shadow-lg text-white border-none mb-4" style={YEMEN_MOBILE_GRADIENT}>
            <CardContent className="p-6 flex items-center justify-between">
                <div className="text-right">
                    <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                    <div className="flex items-baseline gap-1">
                        <h2 className="text-2xl font-black text-white">{userProfile?.balance?.toLocaleString('en-US') || '0'}</h2>
                        <span className="text-[10px] font-bold opacity-70 text-white">ر.ي</span>
                    </div>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl"><Wallet className="h-6 w-6 text-white" /></div>
            </CardContent>
        </Card>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-[#B32C4C]/5">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2 px-1">رقم الجوال</Label>
            <div className="relative">
                <Input type="tel" placeholder="77xxxxxxx" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 focus-visible:ring-[#B32C4C] pr-12 pl-12" />
                <button onClick={handleContactPick} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-[#B32C4C] hover:bg-[#B32C4C]/10 rounded-xl"><Users className="h-5 w-5" /></button>
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-[#B32C4C]" />}
            </div>
        </div>

        {billingInfo && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-[#B32C4C]/5">
                        <TabsTrigger value="balance" className="rounded-xl font-bold text-sm data-[state=active]:bg-[#B32C4C] data-[state=active]:text-white">الرصيد</TabsTrigger>
                        <TabsTrigger value="packages" className="rounded-xl font-bold text-sm data-[state=active]:bg-[#B32C4C] data-[state=active]:text-white">الباقات</TabsTrigger>
                    </TabsList>

                    <TabsContent value="balance" className="pt-4 space-y-4">
                        <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 border border-[#B32C4C]/5 grid grid-cols-2 text-center shadow-sm">
                            <div className="border-l"><p className="text-[10px] font-bold text-[#B32C4C]">رصيد الرقم</p><p className="text-sm font-black">{billingInfo.balance}</p></div>
                            <div><p className="text-[10px] font-bold text-[#B32C4C]">نوع الخط</p><p className="text-sm font-black">{billingInfo.customer_type}</p></div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 text-center border border-[#B32C4C]/5">
                            <Label className="text-sm font-black text-muted-foreground block mb-4">ادخل مبلغ السداد</Label>
                            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none text-[#B32C4C]" />
                            <Button className="w-full h-14 rounded-2xl text-lg font-black mt-8 text-white" style={{ backgroundColor: '#B32C4C' }} onClick={() => setIsConfirming(true)} disabled={!amount}>تسديد الآن</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="packages" className="space-y-4">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-[#B32C4C]/5 grid grid-cols-3 text-center shadow-sm">
                            <div className="border-l"><p className="text-[10px] font-bold text-[#B32C4C]">الرصيد</p><p className="text-sm font-black">{billingInfo.balance}</p></div>
                            <div className="border-l"><p className="text-[10px] font-bold text-[#B32C4C]">النوع</p><p className="text-sm font-black">{billingInfo.customer_type}</p></div>
                            <div><p className="text-[10px] font-bold text-[#B32C4C]">السلفة</p>{billingInfo.isLoan ? <Badge className="bg-red-500">{billingInfo.loanAmount}</Badge> : <Badge className="bg-green-500">سليم</Badge>}</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#B32C4C]/5 overflow-hidden">
                            <div className="p-3 text-center text-white font-black text-sm" style={{ backgroundColor: '#B32C4C' }}>الاشتراكات الحالية</div>
                            <div className="p-4 space-y-2">
                                {activeOffers.length > 0 ? activeOffers.map((off, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-muted/20 rounded-xl border border-muted/50">
                                        <div className="text-right"><p className="text-xs font-black text-primary">{off.offerName}</p><p className="text-[10px] text-muted-foreground">ينتهي: {formatFullDateTime(off.expireDate)}</p></div>
                                        <Button size="sm" onClick={() => handleSearch(phone)} className="h-8 rounded-lg bg-primary text-[10px]">تحديث</Button>
                                    </div>
                                )) : <p className="text-center text-xs text-muted-foreground py-4">لا توجد باقات نشطة</p>}
                            </div>
                        </div>

                        <Accordion type="single" collapsible className="w-full space-y-2">
                            {(lineTypeTab === 'prepaid' ? PREPAID_CATEGORIES : POSTPAID_CATEGORIES).map((cat) => (
                                <AccordionItem key={cat.id} value={cat.id} className="border-none">
                                    <AccordionTrigger className="px-4 py-4 rounded-2xl text-white hover:no-underline shadow-md" style={{ backgroundColor: '#B32C4C' }}>
                                        <div className="flex items-center gap-3 flex-1"><Badge className="bg-white text-[#B32C4C]">{cat.badge}</Badge><span className="text-sm font-black mr-4 text-right">{cat.title}</span></div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-white dark:bg-slate-900 rounded-b-2xl border-x border-b border-[#B32C4C]/10">
                                        <div className="grid gap-3">{cat.offers.map((o) => (<PackageItemCard key={o.offerId} offer={o} onClick={() => setSelectedOffer(o)} />))}</div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </TabsContent>
                </Tabs>
            </div>
        )}
      </div>

      {isProcessing && <ProcessingOverlay message="جاري تنفيذ السداد..." />}
      {isActivatingOffer && <ProcessingOverlay message="جاري تفعيل الباقة..." />}

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[32px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black">تأكيد سداد رصيد</AlertDialogTitle>
                <div className="space-y-3 pt-4 text-right text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">الرقم:</span><span className="font-bold">{phone}</span></div>
                    <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2"><span className="font-black">المبلغ المخصوم:</span><span className="font-black text-[#B32C4C] text-lg">{parseFloat(amount || '0').toLocaleString()} ريال</span></div>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                <AlertDialogAction className="w-full rounded-2xl h-12 font-bold text-white" style={{ backgroundColor: '#B32C4C' }} onClick={handlePayment}>تأكيد</AlertDialogAction>
                <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
          <AlertDialogContent className="rounded-[32px]">
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-center font-black">تأكيد تفعيل الباقة</AlertDialogTitle>
                  <div className="py-4 text-right text-sm space-y-3">
                      <p className="text-center text-lg font-black text-[#B32C4C] mb-2">{selectedOffer?.offerName}</p>
                      <div className="flex justify-between border-b py-2 border-dashed"><span>سعر الباقة:</span><span className="font-bold">{selectedOffer?.price.toLocaleString()} ر.ي</span></div>
                      {billingInfo?.isLoan && <div className="flex justify-between border-b py-2 border-dashed text-red-600 font-bold"><span>سداد سلفة:</span><span>{billingInfo.loanAmount} ر.ي</span></div>}
                      <div className="flex justify-between bg-muted/50 p-3 rounded-xl font-black text-lg"><span>الإجمالي:</span><span className="text-[#B32C4C]">{((selectedOffer?.price || 0) + (billingInfo?.isLoan ? billingInfo.loanAmount || 0 : 0)).toLocaleString()} ريال</span></div>
                  </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                  <AlertDialogAction onClick={handleActivateOffer} className="w-full rounded-2xl h-12 font-bold text-white" style={{ backgroundColor: '#B32C4C' }}>تفعيل</AlertDialogAction>
                  <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      {showSuccess && lastTxDetails && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in-0">
            <Card className="w-full max-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
                <div className="bg-green-500 p-8 flex justify-center"><CheckCircle className="h-16 w-16 text-white animate-bounce" /></div>
                <CardContent className="p-8 space-y-6">
                    <h2 className="text-2xl font-black text-green-600">تمت العملية بنجاح</h2>
                    <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-[#B32C4C]/10">
                        <div className="flex justify-between border-b pb-2"><span>رقم العملية:</span><span className="font-mono font-black">{lastTxDetails.transid}</span></div>
                        <div className="flex justify-between border-b pb-2"><span>رقم الهاتف:</span><span className="font-mono font-bold">{lastTxDetails.phone}</span></div>
                        <div className="flex justify-between"><span>المبلغ:</span><span className="font-black text-[#B32C4C]">{lastTxDetails.amount.toLocaleString()} ريال</span></div>
                    </div>
                    <Button className="w-full h-14 rounded-2xl font-bold text-lg text-white" style={{ backgroundColor: '#B32C4C' }} onClick={() => { setShowSuccess(false); handleSearch(phone); }}>إغلاق</Button>
                </CardContent>
            </Card>
        </div>
      )}
      <Toaster />
    </div>
  );
}
