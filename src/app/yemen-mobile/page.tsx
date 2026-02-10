'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Phone, CheckCircle, Loader2, ChevronDown, RefreshCcw, Globe, Mail, Clock } from 'lucide-react';
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

export const dynamic = 'force-dynamic';

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
];

const MOCK_ACTIVE_SUBS = [
    { name: 'تفعيل خدمة الانترنت - شريحة (3G)', start: '2022-12-23 17:17:50', end: '2037-01-01 00:00:00' },
    { name: 'باقة 450 ميجابايت شريحة', start: '2026-01-15 16:29:31', end: '2026-02-13 23:59:59', highlight: true },
];

const BalanceDisplay = () => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
    const isLoading = isUserLoading || isProfileLoading;

    return (
        <Card className="shadow-md border-none rounded-3xl bg-mesh-gradient text-white">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="font-medium opacity-80 text-xs uppercase tracking-widest text-right">رصيدك الحالي</p>
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
      className="bg-[#FDE6D2] rounded-[20px] p-4 shadow-sm relative overflow-hidden active:scale-[0.98] transition-all cursor-pointer border border-[#EBCDB5] mb-3 text-right"
      onClick={onClick}
    >
      <div className="absolute top-3 left-3 w-8 h-8 rounded-full overflow-hidden border border-white/50 shadow-sm opacity-80">
        <Image src="https://i.postimg.cc/tTXzYWY3/1200x630wa.jpg" alt="YM Logo" fill className="object-cover" />
      </div>
      <div>
        <h4 className="text-xl font-black text-[#8B1D3D] leading-tight mb-0.5">{offer.offerName}</h4>
        <p className="text-[11px] font-bold text-slate-800">دفع مسبق - شريحة</p>
      </div>
      <div className="flex justify-center my-2">
        <span className="text-3xl font-black text-slate-400 opacity-20 tracking-tighter">{offer.price}</span>
      </div>
      <div className="grid grid-cols-4 gap-0 pt-3 border-t border-[#EBCDB5] text-center">
        <div className="space-y-1"><Globe className="w-6 h-6 mx-auto text-[#8B1D3D]" /><p className="text-[11px] font-black text-slate-800">{offer.data || '-'}</p></div>
        <div className="space-y-1 border-r border-[#EBCDB5]"><Mail className="w-6 h-6 mx-auto text-[#8B1D3D]" /><p className="text-[11px] font-black text-slate-800">{offer.sms || '-'}</p></div>
        <div className="space-y-1 border-r border-[#EBCDB5]"><Phone className="w-6 h-6 mx-auto text-[#8B1D3D]" /><p className="text-[11px] font-black text-slate-800">{offer.minutes || '-'}</p></div>
        <div className="space-y-1 border-r border-[#EBCDB5]"><Clock className="w-6 h-6 mx-auto text-[#8B1D3D]" /><p className="text-[11px] font-black text-slate-800">{offer.validity || '-'}</p></div>
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
  const [activeTab, setActiveTab] = useState("balance");
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

  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => { if (showSuccess && audioRef.current) audioRef.current.play().catch(() => {}); }, [showSuccess]);

  const handleSearch = async () => {
    if (phone.length === 9) {
      setShowTabs(true);
      setActiveTab("balance");
      setIsCheckingBilling(true);
      setBillingInfo(null);
      try {
        const response = await fetch('/api/telecom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: phone, action: 'query' }),
        });
        const result = await response.json();
        if (response.ok) {
            setBillingInfo({ balance: parseFloat(result.balance || "0"), customer_type: result.mobileTy || 'دفع مسبق', solfa_status: 'غير متسلف' });
        }
      } catch (error) { console.error(error); } finally { setIsCheckingBilling(false); }
    } else {
      setShowTabs(false);
    }
  };

  useEffect(() => { if (phone.length === 9) handleSearch(); }, [phone]);

  useEffect(() => {
    const val = parseFloat(amount);
    if (!isNaN(val) && val > 0) setNetAmount(val - (val * 0.174));
    else setNetAmount(0);
  }, [amount]);

  const handlePayment = async () => {
    if (!phone || !amount || !user || !userProfile || !firestore || !userDocRef) return;
    const val = parseFloat(amount);
    if (val < 21 || (userProfile.balance ?? 0) < val) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'تأكد من المبلغ والرصيد المتوفر.' });
        return;
    }
    setIsProcessing(true);
    try {
        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-val) });
        batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid, transactionDate: new Date().toISOString(), amount: val,
            transactionType: 'سداد يمن موبايل', notes: `إلى رقم: ${phone}`, recipientPhoneNumber: phone
        });
        await batch.commit();
        setShowSuccess(true);
    } catch (e) { toast({ variant: "destructive", title: "فشل", description: "تعذر إتمام العملية." }); } finally { setIsProcessing(false); setIsConfirming(false); }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري السداد..." />;
  
  if (showSuccess) {
    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] p-8">
                <div className="flex flex-col items-center gap-6">
                    <div className="bg-green-100 p-5 rounded-full"><CheckCircle className="h-16 w-16 text-green-600" /></div>
                    <h2 className="text-2xl font-black">تم السداد بنجاح</h2>
                    <Button className="w-full h-12 rounded-2xl font-bold" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                </div>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <SimpleHeader title="يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />
        <Card className="shadow-lg border-none rounded-[32px] p-6 bg-white space-y-6">
            <div className='space-y-2'>
              <Label className="text-xs font-bold text-muted-foreground text-right block">رقم الهاتف</Label>
              <Input
                type="tel"
                placeholder="77xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="text-center font-black text-4xl h-16 rounded-2xl border-2 bg-muted/30"
              />
            </div>
            {showTabs && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full animate-in fade-in-0">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-2xl h-12">
                         <TabsTrigger value="packages" className="rounded-xl font-bold">الباقات</TabsTrigger>
                         <TabsTrigger value="balance" className="rounded-xl font-bold">الرصيد</TabsTrigger>
                    </TabsList>
                    <TabsContent value="packages" className="pt-6 space-y-6">
                        <Card className="bg-[#fffbeb] border-2 border-amber-100 rounded-3xl p-3 grid grid-cols-3 gap-2 text-center">
                            <div className='p-2 bg-white/50 rounded-2xl'><p className="text-[10px] text-amber-700 font-bold">الرصيد</p><p className="font-black text-xs">{(billingInfo?.balance ?? 0).toLocaleString()}</p></div>
                            <div className='p-2 bg-white/50 rounded-2xl'><p className="text-[10px] text-amber-700 font-bold">النوع</p><p className="font-black text-xs">{billingInfo?.customer_type || '...'}</p></div>
                            <div className='p-2 bg-white/50 rounded-2xl'><p className="text-[10px] text-amber-700 font-bold">السلفة</p><p className="font-black text-xs text-green-600">غير متسلف</p></div>
                        </Card>
                        <Card className="rounded-2xl overflow-hidden bg-white border">
                            <div className="bg-primary py-2 text-white text-center text-sm font-black">الاشتراكات الحالية</div>
                            <CardContent className="p-0 divide-y">
                                {MOCK_ACTIVE_SUBS.map((sub, idx) => (
                                    <div key={idx} className={cn("p-4 flex items-center justify-between gap-4", sub.highlight ? "bg-orange-50" : "")}>
                                        <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setActiveTab("packages")}>
                                            <RefreshCcw className="w-5 h-5 text-primary" /><span className="text-[10px] font-bold text-primary">تجديد</span>
                                        </div>
                                        <div className="flex-1 text-right">
                                            <h5 className="text-xs font-black mb-1">{sub.name}</h5>
                                            <div className="text-[10px] space-y-0.5 flex flex-col items-start">
                                                <div className="flex gap-2 w-full justify-end"><span>{sub.start}</span><span className="text-green-600">:الاشتراك</span></div>
                                                <div className="flex gap-2 w-full justify-end"><span>{sub.end}</span><span className="text-destructive">:الانتهاء</span></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <Accordion type="single" collapsible className="w-full space-y-4">
                          {CATEGORIES.map((cat) => (
                            <AccordionItem key={cat.id} value={cat.id} className="border-none">
                              <AccordionTrigger className="px-5 py-4 bg-primary rounded-2xl shadow-md flex-row-reverse text-white hover:no-underline">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center"><span className="text-primary font-black text-sm">{cat.badge}</span></div>
                                    <span className="text-right flex-1 text-sm font-bold">{cat.title}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="p-4 bg-white border-x border-b rounded-b-2xl">
                                {cat.offers.map((o) => (
                                  <PackageCard key={o.offerId} offer={o} onClick={() => { setSelectedOffer(o); setIsConfirmingOffer(true); }} />
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                    </TabsContent>
                    <TabsContent value="balance" className="pt-6 space-y-6">
                        <div className='space-y-4'>
                            <Label className="text-xs font-bold text-muted-foreground text-right block">المبلغ</Label>
                            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20" />
                            <div className="flex justify-between items-center px-1"><span className="text-xs font-bold text-muted-foreground">صافي الرصيد</span><span className="text-xl font-bold text-primary">{netAmount.toFixed(2)}</span></div>
                        </div>
                        <Button className="w-full h-14 rounded-2xl text-lg font-black" onClick={() => setIsConfirming(true)} disabled={!amount || !phone}>تأكيد السداد</Button>
                    </TabsContent>
                </Tabs>
            )}
        </Card>
      </div>
      <Toaster />
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[32px] text-center">
            <AlertDialogHeader><AlertDialogTitle className="text-xl font-black">تأكيد سداد رصيد</AlertDialogTitle></AlertDialogHeader>
            <div className="py-4 space-y-2">
                <p>سداد مبلغ <span className="font-black text-primary">{amount} ريال</span></p>
                <p>للرقم <span className="font-black">{phone}</span></p>
            </div>
            <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="flex-1 rounded-xl">إلغاء</AlertDialogCancel>
                <AlertDialogAction className="flex-1 rounded-xl" onClick={handlePayment}>تأكيد</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isConfirmingOffer} onOpenChange={setIsConfirmingOffer}>
          <AlertDialogContent className="rounded-[32px] text-center">
              <AlertDialogHeader><AlertDialogTitle className="text-xl font-black">تأكيد تفعيل باقة</AlertDialogTitle></AlertDialogHeader>
              <div className="py-4 space-y-3">
                  <p className="text-sm font-bold text-primary">{selectedOffer?.offerName}</p>
                  <p>للرقم <span className="font-black">{phone}</span></p>
              </div>
              <AlertDialogFooter className="flex-row gap-2">
                  <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                  <AlertDialogAction className="flex-1 rounded-xl" onClick={() => { setIsConfirmingOffer(false); toast({ title: "تم الإرسال", description: "جاري المعالجة..." }); }}>تفعيل</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
