'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Phone, CheckCircle, Loader2, Globe, Mail, Clock, ShieldCheck, Zap, RefreshCw, Info, Gift, Database, Calendar } from 'lucide-react';
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
  AlertDialogDescription,
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
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type BillingInfo = {
    balance: number;
    customer_type: string;
    resultDesc?: string;
};

type ActiveOffer = {
    offerName: string;
    remainAmount: string;
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
  },
  {
    id: 'gifts',
    title: 'باقات هدايا',
    badge: 'Gift',
    icon: Gift,
    offers: [
      { offerId: 'gift_300', offerName: 'هدية 300 دقيقة', price: 400, minutes: '300', validity: '30 يوم', offertype: 'Gift300' },
    ]
  }
];

const PackageCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-[#FDF2F0] dark:bg-slate-900 rounded-[24px] p-4 shadow-sm relative border border-primary/10 mb-3 text-right cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="absolute top-3 left-3 w-8 h-8 rounded-full overflow-hidden opacity-20">
        <Image src="https://i.postimg.cc/tTXzYWY3/1200x630wa.jpg" alt="YM" fill className="object-cover" />
      </div>
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
            <Phone className="w-3 h-3 mx-auto text-primary/60" />
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
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (phone.length === 9) {
      handleSearch();
      setActiveTab("balance");
    } else {
        setBillingInfo(null);
        setActiveOffers([]);
    }
  }, [phone]);

  const handleSearch = async () => {
    if (!phone || phone.length !== 9) return;
    setIsSearching(true);
    try {
      const response = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, action: 'query' }),
      });
      const result = await response.json();
      if (response.ok) {
          setBillingInfo({ 
              balance: parseFloat(result.balance || "0"), 
              customer_type: result.mobileTy || 'دفع مسبق',
              resultDesc: result.resultDesc
          });
          
          const offerResponse = await fetch('/api/telecom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mobile: phone, action: 'queryoffer' }),
          });
          const offerResult = await offerResponse.json();
          if (offerResponse.ok && offerResult.offers) {
              setActiveOffers(offerResult.offers);
          }
      } else {
          toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: result.message || 'تعذر جلب بيانات الرقم' });
      }
    } catch (e) {
        console.error(e);
    } finally {
        setIsSearching(false);
    }
  };

  const handlePayment = async () => {
    if (!phone || !amount || !user || !userDocRef || !firestore) return;
    const val = parseFloat(amount);
    
    if (isNaN(val) || val <= 0) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
        return;
    }

    if ((userProfile?.balance ?? 0) < val) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يغطي هذا المبلغ.' });
        return;
    }

    setIsProcessing(true);
    try {
        const transid = Date.now().toString();
        const response = await fetch('/api/telecom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mobile: phone, 
                amount: val, 
                action: 'bill',
                transid: transid
            })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشلت عملية السداد.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-val) });
        batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid, 
            transactionDate: new Date().toISOString(), 
            amount: val,
            transactionType: 'سداد يمن موبايل', 
            notes: `إلى رقم: ${phone}. مرجع: ${result.sequenceId || transid}`, 
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
    
    const price = selectedOffer.price;
    if ((userProfile?.balance ?? 0) < price) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لتفعيل هذه الباقة.' });
        return;
    }

    setIsActivatingOffer(true);
    try {
        const transid = Date.now().toString();
        const response = await fetch('/api/telecom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mobile: phone, 
                action: 'billover',
                offertype: selectedOffer.offertype,
                transid: transid
            })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشل تفعيل الباقة.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-price) });
        batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid, 
            transactionDate: new Date().toISOString(), 
            amount: price,
            transactionType: `تفعيل ${selectedOffer.offerName}`, 
            notes: `للرقم: ${phone}. مرجع: ${result.sequenceId || transid}`,
            recipientPhoneNumber: phone
        });
        
        await batch.commit();
        toast({ title: 'تم التفعيل بنجاح', description: `تم تفعيل ${selectedOffer.offerName} للرقم ${phone}` });
        setSelectedOffer(null);
        handleSearch();
    } catch (e: any) {
        toast({ variant: "destructive", title: "فشل التفعيل", description: e.message });
    } finally {
        setIsActivatingOffer(false);
    }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري معالجة طلب السداد..." />;
  
  if (showSuccess) {
    return (
        <>
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4 animate-in fade-in-0">
                <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] p-8 border-none">
                    <div className="flex flex-col items-center gap-6">
                        <div className="bg-green-100 p-5 rounded-full"><CheckCircle className="h-16 w-16 text-green-600" /></div>
                        <h2 className="text-2xl font-black">تم السداد بنجاح</h2>
                        <p className="text-sm text-muted-foreground">تم سداد مبلغ {amount} ريال للرقم {phone}</p>
                        <Button className="w-full h-12 rounded-2xl font-bold" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                    </div>
                </Card>
            </div>
        </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-950">
      <SimpleHeader title="يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        <Card className="shadow-xl border-none rounded-[32px] p-6 bg-white dark:bg-slate-900">
            <div className='space-y-3'>
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم الهاتف</Label>
                {isSearching && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>
              <Input
                type="tel"
                placeholder="77xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="text-center font-bold text-2xl h-14 rounded-2xl border-2 border-primary/10 bg-muted/20 focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
            </div>
            
            {phone.length === 9 && (
                <div className="mt-6 animate-in fade-in-0 slide-in-from-top-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-2xl h-12 p-1">
                             <TabsTrigger value="inquiry" className="rounded-xl font-bold text-xs">الاستعلام</TabsTrigger>
                             <TabsTrigger value="packages" className="rounded-xl font-bold text-xs">الباقات</TabsTrigger>
                             <TabsTrigger value="balance" className="rounded-xl font-bold text-xs">الرصيد</TabsTrigger>
                        </TabsList>

                        <TabsContent value="balance" className="pt-6 space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-muted-foreground bg-primary/5 px-3 py-1 rounded-full border border-primary/10">صافي الرصيد المستلم</span>
                            </div>
                            <div className='relative'>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)} 
                                    className="text-center font-black text-3xl h-16 rounded-[24px] bg-primary/5 border-2 border-primary/20 text-primary placeholder:text-primary/20" 
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 font-black">ر.ي</div>
                            </div>
                            <Button 
                                className="w-full h-14 rounded-[24px] text-lg font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform" 
                                onClick={() => setIsConfirming(true)} 
                                disabled={!amount}
                            >
                                تسديد الرصيد
                            </Button>
                        </TabsContent>

                        <TabsContent value="packages" className="pt-6">
                            <Accordion type="single" collapsible className="w-full space-y-4">
                              {CATEGORIES.map((cat) => (
                                <AccordionItem key={cat.id} value={cat.id} className="border-none">
                                  <AccordionTrigger className="px-5 py-4 bg-primary rounded-[20px] text-white hover:no-underline shadow-md">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-xl">
                                            <cat.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-xs font-black">{cat.title}</span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="p-4 bg-white dark:bg-slate-900 border-x border-b rounded-b-[20px] mt-[-10px] pt-6">
                                    {cat.offers.map((o) => (
                                      <PackageCard key={o.offerId} offer={o} onClick={() => { setSelectedOffer(o); }} />
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                        </TabsContent>

                        <TabsContent value="inquiry" className="pt-6 space-y-4">
                            {isSearching ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-20 w-full rounded-2xl" />
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                </div>
                            ) : (
                                <>
                                    {billingInfo && (
                                        <Card className="rounded-[24px] border-primary/10 bg-primary/5 overflow-hidden">
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">الرصيد الحالي في الشريحة</p>
                                                    <p className="text-xl font-black text-primary">{billingInfo.balance.toLocaleString()} ريال</p>
                                                </div>
                                                <button onClick={handleSearch} className="bg-white p-3 rounded-2xl shadow-sm hover:scale-110 transition-transform">
                                                    <RefreshCw className="w-5 h-5 text-primary" />
                                                </button>
                                            </CardContent>
                                        </Card>
                                    )}

                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black text-muted-foreground px-1">الاشتراكات النشطة</h3>
                                        {activeOffers.length > 0 ? (
                                            activeOffers.map((off, idx) => (
                                                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-[24px] border border-primary/5 shadow-sm flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-green-500/10 rounded-xl">
                                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold">{off.offerName}</p>
                                                            <p className="text-[10px] text-muted-foreground">المتبقي: {off.remainAmount}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-bold text-primary mb-1">تنتهي في {off.expireDate}</p>
                                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-lg" onClick={() => setActiveTab("packages")}>تجديد</Button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 bg-muted/20 rounded-[24px] border-2 border-dashed border-primary/10">
                                                <Info className="w-8 h-8 mx-auto text-muted-foreground opacity-30 mb-2" />
                                                <p className="text-xs text-muted-foreground font-bold">لا توجد باقات نشطة حالياً</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </Card>
      </div>
      <Toaster />

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
                      <div className="bg-muted/50 p-3 rounded-2xl border border-primary/5">
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
    </div>
  );
}