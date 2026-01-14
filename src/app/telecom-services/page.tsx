
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, Phone, CheckCircle, Smartphone, Wifi, Zap, Building, HelpCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type UserProfile = {
  balance?: number;
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

  const [amount, setAmount] = useState('');
  const [netAmount, setNetAmount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (phone.length === 9 && (phone.startsWith('77') || phone.startsWith('78'))) {
      setShowTabs(true);
    } else {
      setShowTabs(false);
    }
  }, [phone]);

  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      const tax = 0.174;
      const net = numericAmount / (1 + tax);
      setNetAmount(parseFloat(net.toFixed(2)));
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
            body: JSON.stringify({ mobile: phone, amount: numericAmount })
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
  
  if (showSuccess) {
    return (
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
            <CardTitle className="text-center text-lg font-normal">سداد الرصيد والباقات</CardTitle>
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
                className="text-right"
              />
            </div>
            
            {showTabs && (
                <div className="pt-2 animate-in fade-in-0 duration-300">
                    <Tabs defaultValue="balance" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="balance"><Wallet className="ml-2 h-4 w-4" /> الرصيد</TabsTrigger>
                            <TabsTrigger value="packages"><Wifi className="ml-2 h-4 w-4" /> الباقات</TabsTrigger>
                        </TabsList>
                        <TabsContent value="balance" className="pt-4 space-y-4">
                           <div>
                                <Label htmlFor="amount" className="flex items-center gap-2 mb-1">المبلغ</Label>
                                <Input id="amount" type="number" inputMode='numeric' placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-right" />
                           </div>
                           <div>
                                <Label htmlFor="netAmount" className="flex items-center gap-2 mb-1">صافي الرصيد</Label>
                                <Input id="netAmount" type="text" value={`${netAmount.toLocaleString('en-US')} ريال`} readOnly className="bg-muted focus:ring-0 text-right" />
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
                        <TabsContent value="packages" className="pt-4 space-y-4">
                            <Card className="bg-muted/50">
                                <CardContent className="grid grid-cols-3 gap-2 p-2 text-center">
                                    <div className='p-2 bg-background rounded-md'>
                                        <p className="text-xs text-muted-foreground">رصيد الرقم</p>
                                        <p className="font-bold text-sm">... ريال</p>
                                    </div>
                                    <div className='p-2 bg-background rounded-md'>
                                        <p className="text-xs text-muted-foreground">نوع الرقم</p>
                                        <p className="font-bold text-sm">دفع مسبق</p>
                                    </div>
                                     <div className='p-2 bg-background rounded-md'>
                                        <p className="text-xs text-muted-foreground">فحص السلفة</p>
                                        <p className="font-bold text-sm">غير متسلف</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <PackagesPlaceholder />
                        </TabsContent>
                    </Tabs>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    <Toaster />
    </>
  );
}
