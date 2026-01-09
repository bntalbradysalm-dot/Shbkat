'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, User, CheckCircle, Smartphone, Loader2 } from 'lucide-react';
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
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  id: string;
  balance?: number;
  phoneNumber?: string;
  displayName?: string;
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

export default function BaityBalancePage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [mobileNumber, setMobileNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  
  const handleConfirmClick = () => {
    const numericAmount = parseFloat(amount);
    if (!mobileNumber || !amount || isNaN(numericAmount) || numericAmount <= 0) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم جوال ومبلغ صحيح." });
      return;
    }
    if ((userProfile?.balance ?? 0) < numericAmount) {
      toast({ variant: "destructive", title: "رصيد غير كاف!", description: "رصيدك الحالي لا يكفي لإتمام هذه العملية." });
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalConfirmation = async () => {
    if (!user || !userProfile || !firestore || !userDocRef) return;

    setIsProcessing(true);
    const numericAmount = parseFloat(amount);

    try {
      // Step 1: Call the external API via our new API route
      const apiResponse = await fetch('/api/baity', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            mobile: mobileNumber,
            amount: numericAmount,
        })
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(result.message || 'فشل تسديد الرصيد لدى مزود الخدمة.');
      }

      // Step 2: If API call is successful, perform Firestore batch write
      const batch = writeBatch(firestore);

      // 2a: Decrement user's balance
      batch.update(userDocRef, { balance: increment(-numericAmount) });

      // 2b: Create transaction log for the user
      const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      batch.set(transactionRef, {
        userId: user.uid,
        transactionDate: new Date().toISOString(),
        amount: numericAmount,
        transactionType: 'تسديد رصيد بيتي',
        notes: `إلى رقم: ${mobileNumber}`
      });

      await batch.commit();

      setShowSuccess(true);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "فشل تسديد الرصيد",
            description: error.message || "حدث خطأ أثناء محاولة تنفيذ العملية.",
        });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };
  
  if (showSuccess) {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold">تمت العملية بنجاح</h2>
                         <p className="text-sm text-muted-foreground">تم تسديد الرصيد بنجاح.</p>
                        <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2">
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">الرقم:</span>
                                <span className="font-semibold">{mobileNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">المبلغ:</span>
                                <span className="font-semibold text-destructive">{Number(amount).toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                        <div className="w-full grid grid-cols-1 gap-3 pt-4">
                            <Button variant="outline" onClick={() => router.push('/')}>الرئيسية</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="رصيد بيتي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">تسديد رصيد</CardTitle>
            <CardDescription className="text-center">أدخل رقم الجوال والمبلغ المطلوب.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mobileNumber" className="text-muted-foreground flex items-center gap-2 mb-1">
                <Smartphone className="h-4 w-4" />
                رقم الجوال
              </Label>
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="7xxxxxxxx"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                disabled={isProcessing}
                maxLength={9}
                className="text-right"
              />
            </div>
            
            <div>
              <Label htmlFor="amount" className="text-muted-foreground flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4" />
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

            <Button onClick={handleConfirmClick} className="w-full h-auto py-3 text-base" disabled={!mobileNumber || !amount || isProcessing}>
                {isProcessing ? <Loader2 className="ml-2 h-5 w-5 animate-spin"/> : <Send className="ml-2 h-5 w-5"/>}
                {isProcessing ? 'جاري التسديد...' : 'تسديد الرصيد'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    <Toaster />

    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center">تأكيد العملية</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div className="space-y-4 pt-4 text-base text-foreground text-center">
                         <p className="text-sm text-center text-muted-foreground pb-2">سيتم خصم المبلغ من رصيدك وتسديده للرقم المدخل.</p>
                         <p className="font-bold">{mobileNumber}</p>
                         <p className="text-sm text-center text-muted-foreground">بمبلغ وقدره</p>
                         <p className="text-2xl font-bold text-destructive">{Number(amount).toLocaleString('en-US')} ريال</p>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row justify-center gap-2 pt-4">
                <AlertDialogAction className="flex-1" onClick={handleFinalConfirmation} disabled={isProcessing}>
                    {isProcessing ? 'جاري التنفيذ...' : 'تأكيد'}
                </AlertDialogAction>
                <AlertDialogCancel className="flex-1 mt-0" disabled={isProcessing}>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
