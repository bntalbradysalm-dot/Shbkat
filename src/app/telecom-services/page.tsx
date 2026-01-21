'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, Phone, CheckCircle, Smartphone, Wifi, Zap, Building, HelpCircle, Loader2 } from 'lucide-react';
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
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';

type UserProfile = {
  balance?: number;
};

type BillingInfo = {
    balance: number;
    customer_type: string;
    solfa_status: 'متسلف' | 'غير متسلف' | 'غير معروف';
};

type SolfaApiResponse = {
    status: '1' | '0'; // 1 for active loan, 0 for no loan
    message: string;
    loan_amount?: string;
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

const PackagesPlaceholder = () => (
    <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-background">
            <h4 className="font-bold mb-2 text-center">الاشتراكات الحالية</h4>
            <p className="text-sm text-center text-muted-foreground">لا توجد اشتراكات حالية.</p>
        </div>
        <div className='space-y-2'>
            {['باقات مزايا', 'باقات فورجي', 'باقات فولتي', 'باقات الانترنت الشهرية', 'باقات الانترنت 10 ايام'].map(pkg => (
                <Button key={pkg} variant="outline" className="w-full justify-between">
                    {pkg}
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </Button>
            ))}
        </div>
    </div>
);


export default function TelecomServicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [phone, setPhone] = useState('');
  const [showTabs, setShowTabs] = useState(false);
  const [isCheckingBilling, setIsCheckingBilling] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);

  const [amount, setAmount] = useState('');
  const [netAmount, setNetAmount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("yemen_mobile");
  const audioRef = useRef<HTMLAudioElement>(null);

  // Yemen 4G states
  const [yemen4GPhone, setYemen4GPhone] = useState('');
  const [yemen4GAmount, setYemen4GAmount] = useState('');
  const [is4GQuerying, setIs4GQuerying] = useState(false);
  const [is4GProcessing, setIs4GProcessing] = useState(false);
  const [is4GConfirming, setIs4GConfirming] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (showSuccess && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  }, [showSuccess]);

  useEffect(() => {
    const handleSearch = async () => {
      if ((phone.length === 9 && (phone.startsWith('77') || phone.startsWith('78')))) {
        setShowTabs(true);
        setIsCheckingBilling(true);
        setBillingInfo(null);
        try {
          const [balanceResponse, solfaResponse] = await Promise.all([
            fetch('/api/yem-query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mobile: phone, type: 'balance' }),
            }),
            fetch('/api/telecom', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mobile: phone,
                action: 'solfa',
              }),
            })
          ]);
  
          const balanceResult = await balanceResponse.json();
          const solfaResult = await solfaResponse.json();
  
          if (!balanceResponse.ok) {
            console.error("Balance query error details:", balanceResult);
            throw new Error(balanceResult.message || 'فشل الاستعلام عن الرصيد.');
          }

          if (!solfaResponse.ok) {
            if (solfaResult && Object.keys(solfaResult).length > 0) {
              console.error("Solfa query error details:", solfaResult);
            }
          }
          
          let finalSolfaStatus: BillingInfo['solfa_status'] = 'غير معروف';
          if (solfaResponse.ok && solfaResult.status) {
            finalSolfaStatus = solfaResult.status === '1' ? 'متسلف' : 'غير متسلف';
          }
  
          setBillingInfo({
            balance: balanceResult.data?.balance,
            customer_type: balanceResult.data?.customer_type,
            solfa_status: finalSolfaStatus
          });

        } catch (error: any) {
          console.error("Full error object:", error);
          toast({ variant: "destructive", title: "خطأ في الاستعلام", description: error.message });
          setBillingInfo(null);
        } finally {
          setIsCheckingBilling(false);
        }
      } else {
        setShowTabs(false);
        setBillingInfo(null);
      }
    };
    
    const timerId = setTimeout(() => {
        handleSearch();
    }, 500);

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
        toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات المستخدم أو الطلب غير مكتملة.' });
        return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
        return;
    }
    
    if (numericAmount < 21) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'أقل مبلغ للسداد هو 21 ريال.' });
        return;
    }

    if ((userProfile.balance ?? 0) < numericAmount) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام هذه العملية.' });
        return;
    }

    setIsProcessing(true);

    try {
        const response = await fetch('/api/baitynet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mobile: phone,
                amount: numericAmount,
                type: 'balance',
            })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشلت عملية السداد من المصدر.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-numericAmount) });
        const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
        batch.set(transactionRef, {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: numericAmount,
            transactionType: `سداد رصيد وباقات`,
            notes: `إلى رقم: ${phone}`,
            recipientPhoneNumber: phone
        });
        await batch.commit();
        setShowSuccess(true);
    } catch (error: any) {
        toast({ variant: "destructive", title: "فشلت عملية السداد", description: error.message || "حدث خطأ غير متوقع." });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  const handle4GQuery = async () => {
    if (!yemen4GPhone) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رقم هاتف.' });
        return;
    }

    setIs4GQuerying(true);

    try {
        const response = await fetch('/api/yem-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                mobile: yemen4GPhone,
                type: 'yemen4G' 
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشل الاستعلام.');
        }

        const description = `الرصيد: ${result.R_CardBalance || 'غير معروف'}`;

        toast({
            title: 'نتيجة الاستعلام',
            description: description,
        });

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'فشل الاستعلام',
            description: error.message
        });
    } finally {
        setIs4GQuerying(false);
    }
};

  const handle4GPayment = async () => {
    if (!yemen4GPhone || !yemen4GAmount || !user || !userProfile || !firestore || !userDocRef) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات المستخدم أو الطلب غير مكتملة.' });
        return;
    }
    const numericAmount = parseFloat(yemen4GAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
        return;
    }
    if ((userProfile.balance ?? 0) < numericAmount) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام هذه العملية.' });
        return;
    }

    setIs4GProcessing(true);
    try {
        const response = await fetch('/api/baitynet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mobile: yemen4GPhone,
                amount: numericAmount,
                type: 'line',
            })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'فشلت عملية السداد من المصدر.');
        }
        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-numericAmount) });
        const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
        batch.set(transactionRef, {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: numericAmount,
            transactionType: 'سداد يمن فورجي',
            notes: `إلى رقم: ${yemen4GPhone}`,
            recipientPhoneNumber: yemen4GPhone
        });
        await batch.commit();
        setAmount(yemen4GAmount);
        setShowSuccess(true);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'فشل السداد', description: error.message });
    } finally {
        setIs4GProcessing(false);
        setIs4GConfirming(false);
    }
  };

  if (isProcessing || is4GProcessing) {
    return <ProcessingOverlay message="جاري تنفيذ السداد..." />;
  }
  
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
      <SimpleHeader title="رصيد وباقات" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />
        <Card className="shadow-lg">
          <CardHeader>
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="yemen_mobile">يمن موبايل</TabsTrigger>
                  <TabsTrigger value="yemen_4g">يمن فورجي</TabsTrigger>
              </TabsList>
             </Tabs>
          </CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="yemen_mobile">
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
                            <PackagesPlaceholder />
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
                                    هل أنت متأكد من رغبتك في تسديد مبلغ{' '}
                                    <span className="font-bold text-primary">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span>{' '}
                                    إلى الرقم{' '}
                                    <span className="font-bold text-primary">{phone}</span>؟
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
          </TabsContent>
          <TabsContent value="yemen_4g">
            <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="yemen-4g-phone" className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4" />
                    ادخل رقم الهاتف
                  </Label>
                  <Input
                    id="yemen-4g-phone"
                    type="tel"
                    inputMode='numeric'
                    placeholder="7xxxxxxx"
                    value={yemen4GPhone}
                    onChange={(e) => setYemen4GPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    maxLength={9}
                    className="text-right font-semibold"
                  />
                </div>
                 <div>
                    <Label htmlFor="yemen-4g-amount" className="flex items-center gap-2 mb-1">
                        <Wallet className="h-4 w-4" />
                        المبلغ
                    </Label>
                    <Input
                        id="yemen-4g-amount"
                        type="number"
                        inputMode='numeric'
                        placeholder="0.00"
                        value={yemen4GAmount}
                        onChange={(e) => setYemen4GAmount(e.target.value)}
                        className="text-right"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button variant="outline" onClick={handle4GQuery} disabled={is4GQuerying || !yemen4GPhone}>
                       {is4GQuerying ? <Loader2 className="h-4 w-4 animate-spin ml-2"/> : null}
                        استعلام يمن فورجي
                    </Button>
                    <AlertDialog open={is4GConfirming} onOpenChange={setIs4GConfirming}>
                        <AlertDialogTrigger asChild>
                            <Button disabled={is4GProcessing || !yemen4GPhone || !yemen4GAmount}>
                                {is4GProcessing ? <Loader2 className="h-4 w-4 animate-spin ml-2"/> : null}
                                تسديد
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد السداد</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هل أنت متأكد من رغبتك في تسديد مبلغ {Number(yemen4GAmount).toLocaleString('en-US')} ريال للرقم {yemen4GPhone}؟
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={is4GProcessing}>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handle4GPayment} disabled={is4GProcessing}>
                                    {is4GProcessing ? 'جاري السداد...' : 'تأكيد'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
          </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
    <Toaster />
    </>
  );
}
