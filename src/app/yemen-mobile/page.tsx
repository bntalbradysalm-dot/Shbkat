'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, Phone, CheckCircle, Wifi, Zap, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    offerStartDate: string;
    offerEndDate: string;
};

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
        <Card className="shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="font-medium text-muted-foreground">رصيدك الحالي</p>
                    {isLoading ? (
                        <Skeleton className="h-8 w-32 mt-2" />
                    ) : (
                        <p className="text-2xl font-bold text-primary mt-1">{(userProfile?.balance ?? 0).toLocaleString('en-US')} <span className="text-base">ريال</span></p>
                    )}
                </div>
                <Wallet className="h-8 w-8 text-primary" />
            </CardContent>
        </Card>
    );
}

export default function YemenMobilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [phone, setPhone] = useState('');
  const [showTabs, setShowTabs] = useState(false);
  const [isCheckingBilling, setIsCheckingBilling] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [isQueryingOffers, setIsQueryingOffers] = useState(false);
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
        setIsQueryingOffers(true);
        setBillingInfo(null);
        setOffers(null);
        
        try {
          // استعلام الرصيد أولاً
          const balanceRes = await fetch('/api/telecom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: phone, action: 'query' }),
          });
          const balanceResult = await balanceRes.json();

          if (!balanceRes.ok) throw new Error(balanceResult.message || 'فشل الاستعلام عن الرصيد.');

          // ثم استعلام السلفة والعروض
          const [solfaRes, offersRes] = await Promise.all([
            fetch('/api/telecom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mobile: phone, action: 'solfa' }),
            }),
            fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, action: 'queryoffer' }),
            })
          ]);

          const solfaResult = await solfaRes.json();
          const offersResult = await offersRes.json();

          let finalSolfaStatus: BillingInfo['solfa_status'] = 'غير معروف';
          if (solfaRes.ok && solfaResult.status) {
            finalSolfaStatus = solfaResult.status === '1' ? 'متسلف' : 'غير متسلف';
          }
  
          setBillingInfo({
            balance: balanceResult.balance || 0,
            customer_type: balanceResult.mobileTy || 'غير معروف',
            solfa_status: finalSolfaStatus
          });

          setOffers(offersResult.offers || []);

        } catch (error: any) {
          toast({ variant: "destructive", title: "خطأ", description: error.message });
        } finally {
          setIsCheckingBilling(false);
          setIsQueryingOffers(false);
        }
      } else {
        setShowTabs(false);
        setBillingInfo(null);
        setOffers(null);
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
            notes: `إلى رقم: ${phone}. مرجع: ${result.transid || transid}`,
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
                  offertype: selectedOffer.offerId
              })
          });

          const result = await response.json();
          if (!response.ok) {
              throw new Error(result.message || 'فشل تفعيل الباقة.');
          }

          toast({
              title: "نجاح",
              description: `تم إرسال طلب تفعيل باقة "${selectedOffer.offerName}" بنجاح.`
          });

      } catch (error: any) {
          toast({ variant: "destructive", title: "خطأ", description: error.message });
      } finally {
          setIsActivatingOffer(false);
          setIsConfirmingOffer(false);
          setSelectedOffer(null);
      }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ السداد..." />;
  
  if (showSuccess) {
    return (
        <>
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                <Card className="w-full max-w-sm text-center shadow-2xl">
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="bg-green-100 p-4 rounded-full"><CheckCircle className="h-16 w-16 text-green-600" /></div>
                            <h2 className="text-2xl font-bold">تم السداد بنجاح</h2>
                            <p className="text-sm text-muted-foreground">تم سداد مبلغ {Number(amount).toLocaleString('en-US')} ريال بنجاح.</p>
                            <Button className="w-full mt-4" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="خدمات يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />
        <Card className="shadow-lg">
          <CardHeader>
             <CardTitle className="text-center">سداد رصيد وباقات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4" />
                ادخل رقم الهاتف
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode='numeric'
                placeholder="7xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="text-right font-semibold"
              />
            </div>
            
            {showTabs && (
                <div className="pt-2 animate-in fade-in-0 duration-300">
                    <Tabs defaultValue="balance" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                             <TabsTrigger value="packages"><Wifi className="ml-2 h-4 w-4" /> الباقات</TabsTrigger>
                             <TabsTrigger value="balance"><Wallet className="ml-2 h-4 w-4" /> الرصيد</TabsTrigger>
                        </TabsList>
                        <TabsContent value="packages" className="pt-4 space-y-4">
                            <Card className="bg-muted/50">
                                <CardContent className="grid grid-cols-3 gap-2 p-2 text-center">
                                    <div className='p-2 bg-background rounded-md'>
                                        <p className="text-xs text-muted-foreground">رصيد الرقم</p>
                                        {isCheckingBilling ? <Skeleton className="h-5 w-12 mx-auto mt-1" /> : <p className="font-bold text-sm">{(billingInfo?.balance ?? 0).toLocaleString()} ريال</p>}
                                    </div>
                                    <div className='p-2 bg-background rounded-md'>
                                        <p className="text-xs text-muted-foreground">نوع الرقم</p>
                                        {isCheckingBilling ? <Skeleton className="h-5 w-12 mx-auto mt-1" /> : <p className="font-bold text-sm">{billingInfo?.customer_type ?? '...'}</p>}
                                    </div>
                                     <div className='p-2 bg-background rounded-md'>
                                        <p className="text-xs text-muted-foreground">فحص السلفة</p>
                                        {isCheckingBilling ? <Skeleton className="h-5 w-12 mx-auto mt-1" /> : <p className="font-bold text-sm">{billingInfo?.solfa_status ?? '...'}</p>}
                                    </div>
                                </CardContent>
                            </Card>
                             {isQueryingOffers ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : offers && offers.length > 0 ? (
                                <div className="space-y-2">
                                    <h4 className="font-bold mb-2 text-center text-sm">الباقات المتاحة</h4>
                                    {offers.map((offer: Offer) => (
                                        <Button key={offer.offerId} variant="outline" className="w-full justify-between h-auto py-3 text-right" onClick={() => handleOfferClick(offer)}>
                                            <span className="whitespace-normal">{offer.offerName}</span>
                                            <Zap className="w-4 h-4 text-primary shrink-0" />
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-center text-muted-foreground p-4">لا توجد باقات متاحة حالياً.</p>
                            )}
                        </TabsContent>
                        <TabsContent value="balance" className="pt-4 space-y-4">
                           <div className='text-right'>
                                <Label htmlFor="amount" className="flex items-center justify-end gap-2 mb-1">المبلغ</Label>
                                <Input id="amount" type="number" inputMode='numeric' placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-right" />
                           </div>
                           <div className='text-right'>
                                <Label htmlFor="netAmount" className="flex items-center justify-end gap-2 mb-1">صافي الرصيد</Label>
                                <Input id="netAmount" type="text" value={netAmount.toFixed(2)} readOnly className="bg-muted focus:ring-0 text-right" />
                           </div>
                           <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                                <AlertDialogTrigger asChild>
                                <Button className="w-full" disabled={isProcessing || !amount || !phone}>
                                    <Send className="ml-2 h-4 w-4" />
                                    تسديد
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-center">تأكيد السداد</AlertDialogTitle>
                                    <AlertDialogDescription className="text-center pt-2">
                                    هل أنت متأكد من تسديد مبلغ{' '}
                                    <span className="font-bold text-primary">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span>{' '}
                                    إلى الرقم <span className="font-bold text-primary">{phone}</span>؟
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePayment} disabled={isProcessing}>
                                    {isProcessing ? 'جاري السداد...' : 'تأكيد'}
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
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>تأكيد تفعيل الباقة</AlertDialogTitle>
                <AlertDialogDescription>
                    هل أنت متأكد من تفعيل باقة "{selectedOffer?.offerName}" للرقم {phone}؟ سيتم خصم القيمة من رصيدك.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isActivatingOffer}>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleActivateOffer} disabled={isActivatingOffer}>
                    {isActivatingOffer ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : 'تأكيد التفعيل'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
