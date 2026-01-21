'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, Phone, CheckCircle, Wifi } from 'lucide-react';
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
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';

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
        <Card className="shadow-lg">
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

function LandlinePageComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const phone = searchParams.get('phone');
  const type = searchParams.get('type');
  const typeName = type === 'line' ? 'هاتف ثابت' : 'نت ADSL';
  
  const [amount, setAmount] = useState('');
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
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  }, [showSuccess]);
  
  const handlePayment = async () => {
    if (!phone || !type || !user || !userProfile || !firestore || !userDocRef) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات المستخدم أو الطلب غير مكتملة.' });
        return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
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
                type: type,
            })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'فشلت عملية السداد من المصدر.');
        }

        const batch = writeBatch(firestore);
        
        // 1. Deduct balance
        batch.update(userDocRef, { balance: increment(-numericAmount) });

        // 2. Create transaction record
        const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
        batch.set(transactionRef, {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: numericAmount,
            transactionType: `سداد ${typeName}`,
            notes: `إلى رقم: ${phone}`,
            recipientPhoneNumber: phone
        });
        
        await batch.commit();

        setShowSuccess(true);

    } catch (error: any) {
        console.error("Payment failed:", error);
        toast({
            variant: "destructive",
            title: "فشلت عملية السداد",
            description: error.message || "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  if (isProcessing) {
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
      <SimpleHeader title={`سداد ${typeName}`} />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">تسديد فاتورة</CardTitle>
            <CardDescription className="text-center">أدخل المبلغ المراد سداده للرقم {phone}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount" className="flex items-center gap-2 mb-1">
                {type === 'line' ? <Phone className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                المبلغ
              </Label>
              <Input
                id="amount"
                type="number"
                inputMode='numeric'
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={isProcessing || !amount}>
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
          </CardContent>
        </Card>
      </div>
    </div>
    <Toaster />
    </>
  );
}

export default function LandlineServicesPage() {
    return (
        <React.Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
            <LandlinePageComponent />
        </React.Suspense>
    )
}
