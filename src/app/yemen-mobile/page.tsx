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
  Gift,
  ChevronDown,
  Globe,
  Mail,
  Phone as PhoneIcon,
  Clock,
  AlertCircle,
  CalendarDays
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
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

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
    remainAmount: string;
    expireDate: string;
    startDate?: string;
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
      { offerId: 'm1200', offerName: 'مزايا الشهرية 1200', price: 1350, data: '250 MB', sms: '150', minutes: '300', validity: '30 يوم', offertype: 'Mazaya1200' },
      { offerId: 'm2500', offerName: 'مزايا الشهرية 2500', price: 2800, data: '1 GB', sms: '300', minutes: '600', validity: '30 يوم', offertype: 'Mazaya2500' },
      { offerId: 'm5000', offerName: 'مزايا الشهرية 5000', price: 5500, data: '2.5 GB', sms: '600', minutes: '1200', validity: '30 يوم', offertype: 'Mazaya5000' },
    ]
  },
  {
    id: '4g',
    title: 'باقات فورجي',
    badge: '4G',
    icon: Zap,
    offers: [
      { offerId: '4g_6gb', offerName: '4G - 6 جيجا', price: 2400, data: '6 GB', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم', offertype: '4G_6GB' },
      { offerId: '4g_12gb', offerName: '4G - 12 جيجا', price: 4400, data: '12 GB', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم', offertype: '4G_12GB' },
      { offerId: '4g_25gb', offerName: '4G - 25 جيجا', price: 8500, data: '25 GB', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم', offertype: '4G_25GB' },
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

const PackageItemCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-accent/10 dark:bg-slate-900 rounded-2xl p-4 shadow-sm relative border border-primary/5 mb-3 text-right cursor-pointer hover:bg-accent/20 transition-all active:scale-[0.98]"
      onClick={onClick}
    >
      <h4 className="text-sm font-bold text-primary mb-1">{offer.offerName}</h4>
      <div className="flex items-baseline gap-1 justify-end">
        <span className="text-xl font-black text-primary">{offer.price.toLocaleString()}</span>
        <span className="text-[10px] font-bold text-muted-foreground">ريال</span>
      </div>
      
      <div className="grid grid-cols-4 gap-1 pt-2 mt-2 border-t border-primary/5 text-center">
        <div className="space-y-1">
            <Globe className="w-3 h-3 mx-auto text-primary/60" />
            <p className="text-[8px] font-bold truncate">{offer.data || '-'}</p>
        </div>
        <div className="space-y-1">
            <Mail className="w-3 h-3 mx-auto text-primary/60" />
            <p className="text-[8px] font-bold truncate">{offer.sms || '-'}</p>
        </div>
        <div className="space-y-1">
            <PhoneIcon className="w-3 h-3 mx-auto text-primary/60" />
            <p className="text-[8px] font-bold truncate">{offer.minutes || '-'}</p>
        </div>
        <div className="space-y-1">
            <Clock className="w-3 h-3 mx-auto text-primary/60" />
            <p className="text-[8px] font-bold truncate">{offer.validity || '-'}</p>
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

          const isLoan = solfaResult.status === "1";
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
              setActiveOffers(offerResult.offers);
          } else {
              setActiveOffers([
                  { offerName: 'مزايا الشهرية - دفع مسبق 350 دقيقه 150 رساله 250 ميجا', remainAmount: 'نشط', expireDate: '2026-03-03 23:59:59', startDate: '2026-02-02 17:22:52' },
              ]);
          }
      }
    } catch (e) {
        console.error("Search Error:", e);
    } finally {
        setIsSearching(false);
    }
  };

  const handlePayment = async () => {
    if (!phone || !amount || !user || !userDocRef || !firestore) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    if ((userProfile?.balance ?? 0) < val) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لإتمام العملية.' });
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
        batch.update(userDocRef, { balance: increment(-val) });
        batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid, 
            transactionDate: new Date().toISOString(), 
            amount: val,
            transactionType: 'سداد يمن موبايل', 
            notes: `إلى رقم: ${phone}. المرجع: ${result.sequenceId || transid}`, 
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
    
    if ((userProfile?.balance ?? 0) < selectedOffer.price) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لتفعيل هذه الباقة.' });
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
        batch.update(userDocRef, { balance: increment(-selectedOffer.price) });
        batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid, transactionDate: new Date().toISOString(), amount: selectedOffer.price,
            transactionType: `تفعيل ${selectedOffer.offerName}`, notes: `للرقم: ${phone}`, recipientPhoneNumber: phone
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

  if (isProcessing) return <ProcessingOverlay message="جاري معالجة طلب السداد..." />;

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <SimpleHeader title="يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-primary/5">
                    <TabsTrigger value="packages" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الباقات</TabsTrigger>
                    <TabsTrigger value="balance" className="rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white">الرصيد</TabsTrigger>
                </TabsList>

                <TabsContent value="packages" className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-primary/5">
                        <div className="grid grid-cols-3 text-center border-b bg-muted/10">
                            <div className="p-3 border-l">
                                <p className="text-[10px] font-bold text-primary mb-1">رصيد الرقم</p>
                                <p className="text-sm font-black text-primary">{billingInfo?.balance.toLocaleString() || '0.00'}</p>
                            </div>
                            <div className="p-3 border-l">
                                <p className="text-[10px] font-bold text-primary mb-1">نوع الرقم</p>
                                <p className="text-sm font-black text-primary">{billingInfo?.customer_type || '...'}</p>
                            </div>
                            <div className="p-3">
                                <p className="text-[10px] font-bold text-orange-600 mb-1">فحص السلفة</p>
                                <div className="flex items-center justify-center gap-1">
                                    {isSearching ? (
                                        <Skeleton className="h-5 w-16" />
                                    ) : billingInfo?.isLoan ? (
                                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 px-1.5 h-6">
                                            <Frown className="h-3 w-3" />
                                            <span className="text-[9px] font-black">{billingInfo.loanAmount} ريال</span>
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
                                    <div key={idx} className="flex gap-4 items-start p-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-primary/5 mb-3 text-right animate-in fade-in-0 slide-in-from-bottom-2">
                                        {/* الزر على اليسار */}
                                        <div className="flex flex-col items-center justify-center">
                                            <button 
                                                onClick={() => setActiveTab("packages")}
                                                className="bg-primary p-4 rounded-[20px] shadow-lg active:scale-95 transition-all flex flex-col items-center justify-center gap-1 min-w-[70px]"
                                            >
                                                <RefreshCw className="w-6 h-6 text-white" />
                                                <span className="text-[10px] text-white font-bold">تجديد</span>
                                            </button>
                                        </div>

                                        {/* المحتوى على اليمين */}
                                        <div className="flex-1 space-y-3">
                                            <h4 className="text-sm font-black text-[#002B5B] dark:text-primary-foreground leading-tight">
                                                {off.offerName}
                                            </h4>
                                            
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-end gap-2 text-[11px]">
                                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tracking-tighter">
                                                        {off.startDate || 'غير متوفر'}
                                                    </span>
                                                    <span className="font-black text-green-600 min-w-[60px]">الإشتراك:</span>
                                                </div>
                                                
                                                <div className="flex items-center justify-end gap-2 text-[11px]">
                                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tracking-tighter">
                                                        {off.expireDate}
                                                    </span>
                                                    <span className="font-black text-red-600 min-w-[60px]">الإنتهاء:</span>
                                                </div>
                                            </div>

                                            {off.remainAmount !== 'نشط' && (
                                                <div className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-primary/70 bg-primary/5 p-1 rounded-lg">
                                                    <span>{off.remainAmount} :المتبقي</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                                                </div>
                                            )}
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
                </TabsContent>

                <TabsContent value="balance" className="pt-4 space-y-6 animate-in fade-in-0">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-primary/5 text-center">
                        <Label className="text-sm font-black text-muted-foreground block mb-4">أدخل مبلغ السداد</Label>
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
        )}
      </div>

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[32px]">
            <AlertDialogHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                    <Wallet className="w-8 h-8 text-primary" />
                </div>
                <AlertDialogTitle className="text-center font-black">تأكيد سداد رصيد</AlertDialogTitle>
                <div className="text-center text-base pt-2 text-muted-foreground">
                    سيتم سداد مبلغ <span className="font-black text-primary text-xl">{amount} ريال</span> <br />
                    للرقم <span className="font-black text-foreground">{phone}</span>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 mt-6">
                <AlertDialogCancel className="flex-1 rounded-2xl h-12">إلغاء</AlertDialogCancel>
                <AlertDialogAction className="flex-1 rounded-2xl h-12 font-bold" onClick={handlePayment}>تأكيد السداد</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
          <AlertDialogContent className="rounded-[32px]">
              <AlertDialogHeader>
                  <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
                      <Gift className="w-8 h-8 text-primary" />
                  </div>
                  <AlertDialogTitle className="text-center font-black">تأكيد تفعيل الباقة</AlertDialogTitle>
                  <div className="py-4 text-center space-y-2">
                      <p className="text-lg font-black text-primary">{selectedOffer?.offerName}</p>
                      <p className="text-sm font-bold text-muted-foreground">للرقم: {phone}</p>
                      <div className="bg-muted/50 p-3 rounded-2xl border border-primary/5 mt-2">
                        <p className="text-xs font-bold">السعر: {selectedOffer?.price.toLocaleString()} ريال</p>
                        <p className="text-xs text-destructive font-bold mt-1">سيتم خصم القيمة من رصيدك الحالي</p>
                      </div>
                  </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-3 mt-6">
                  <AlertDialogCancel className="flex-1 rounded-2xl h-12" disabled={isActivatingOffer}>تراجع</AlertDialogCancel>
                  <AlertDialogAction onClick={handleActivateOffer} className="flex-1 rounded-2xl h-12 font-bold" disabled={isActivatingOffer}>
                      {isActivatingOffer ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تفعيل الآن'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
