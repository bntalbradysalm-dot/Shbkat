
'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Wallet, Phone, Database, CheckCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
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
import { useRouter } from 'next/navigation';

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

const yemenForgeePackages = [
  { name: 'باقة 15GB', size: 15, price: 2400 },
  { name: 'باقة 25GB', size: 25, price: 4000 },
  { name: 'باقة 60GB', size: 60, price: 8000 },
  { name: 'باقة 130GB', size: 130, price: 16000 },
  { name: 'باقة 250GB', size: 250, price: 26000 },
  { name: 'باقة 500GB', size: 500, price: 46000 },
];

type Package = typeof yemenForgeePackages[0];

const COMMISSION_RATE = 0.10; // 10%

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


export default function PayBalancePage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPackages, setShowPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const { user } = useUser();
  const firestore = useFirestore();
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handlePhoneSubmit = () => {
    if (phoneNumber.startsWith('10') && phoneNumber.length === 9) {
      setShowPackages(true);
      toast({
        title: 'تم التحقق',
        description: 'الرقم صحيح، يمكنك الآن اختيار الباقة المناسبة.',
      });
    } else {
      setShowPackages(false);
      toast({
        variant: 'destructive',
        title: 'رقم غير صحيح',
        description: 'يجب أن يبدأ الرقم بـ 10 وأن يتكون من 9 أرقام.',
      });
    }
  };
  
  const handlePurchase = async () => {
    if (!selectedPackage || !user || !userProfile || !firestore || !userDocRef || !userProfile.displayName || !userProfile.phoneNumber) return;
  
    setIsProcessing(true);
    
    const commission = selectedPackage.price * COMMISSION_RATE;
    const totalCost = selectedPackage.price + commission;
    const currentBalance = userProfile.balance ?? 0;
  
    if (currentBalance < totalCost) {
      toast({
        variant: 'destructive',
        title: 'رصيد غير كاف',
        description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية.',
      });
      setIsProcessing(false);
      setIsConfirming(false);
      return;
    }
  
    try {
      const batch = writeBatch(firestore);
  
      // 1. Deduct balance from user
      batch.update(userDocRef, { balance: increment(-totalCost) });
  
      // 2. Create a Yemen4G request document
      const yemen4gRequestRef = doc(collection(firestore, 'yemen4gRequests'));
      batch.set(yemen4gRequestRef, {
        userId: user.uid,
        userName: userProfile.displayName,
        userPhoneNumber: userProfile.phoneNumber,
        targetPhoneNumber: phoneNumber,
        packageTitle: selectedPackage.name,
        packagePrice: selectedPackage.price,
        commission: commission,
        totalCost: totalCost,
        status: 'pending',
        requestTimestamp: new Date().toISOString(),
      });
  
      await batch.commit();
      setShowSuccess(true);
    } catch (error) {
      console.error("Purchase failed:", error);
      toast({
        variant: 'destructive',
        title: 'فشل إرسال الطلب',
        description: 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.',
      });
    } finally {
      setIsProcessing(false);
      setIsConfirming(false);
    }
  };


  if (showSuccess) {
    const commission = (selectedPackage?.price || 0) * COMMISSION_RATE;
    const totalCost = (selectedPackage?.price || 0) + commission;
    return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold">تم إرسال طلب السداد</h2>
                        <p className="text-sm text-muted-foreground">سيقوم المشرف بمعالجة طلبك في أقرب وقت.</p>
                        <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2">
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">الباقة:</span>
                                <span className="font-semibold">{selectedPackage?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">التكلفة الإجمالية:</span>
                                <span className="font-semibold text-destructive">{totalCost.toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-3 pt-4">
                            <Button variant="outline" onClick={() => router.push('/')}>الرئيسية</Button>
                            <Button onClick={() => {
                                setShowSuccess(false);
                                setShowPackages(false);
                                setPhoneNumber('');
                                setSelectedPackage(null);
                            }} variant="default">سداد جديد</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="يمن 4G" />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <BalanceDisplay />

          <Card>
            <CardHeader>
              <CardTitle>إدخال الرقم</CardTitle>
              <CardDescription>أدخل رقم الهاتف الذي تود سداد الرصيد له.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-number" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  أدخل رقم الهاتف
                </Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="10xxxxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  maxLength={9}
                />
              </div>
              <Button className="w-full" onClick={handlePhoneSubmit}>
                عرض الباقات
              </Button>
            </CardContent>
          </Card>
          
          {showPackages && (
             <Card className="animate-in fade-in-0 duration-500">
                <CardHeader>
                    <CardTitle>اختر الباقة</CardTitle>
                    <CardDescription>اختر الباقة المناسبة للرقم: {phoneNumber}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {yemenForgeePackages.map((pkg) => (
                    <Card 
                        key={pkg.name} 
                        className="flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-primary transition-all"
                        onClick={() => {
                            setSelectedPackage(pkg);
                            setIsConfirming(true);
                        }}
                    >
                        <Database className="h-8 w-8 text-primary mb-2" />
                        <p className="font-bold text-lg">{pkg.name}</p>
                        <p className="font-semibold text-primary">{pkg.price.toLocaleString('en-US')} ريال</p>
                    </Card>
                  ))}
                </CardContent>
             </Card>
          )}
        </div>
      </div>
      <Toaster />

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        {selectedPackage && (
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">تأكيد عملية السداد</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className='space-y-3 text-center pt-2'>
                             <p>
                                هل أنت متأكد من رغبتك في سداد <span className="font-bold">{selectedPackage.name}</span> للرقم {phoneNumber}؟
                            </p>
                            <div className="text-sm bg-muted p-3 rounded-lg text-right space-y-2">
                                <div className="flex justify-between">
                                    <span className='text-muted-foreground'>المبلغ:</span>
                                    <span className='font-semibold'>{selectedPackage.price.toLocaleString('en-US')} ريال</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className='text-muted-foreground'>العمولة (10%):</span>
                                    <span className='font-semibold'>{(selectedPackage.price * COMMISSION_RATE).toLocaleString('en-US')} ريال</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 mt-2">
                                    <span className='text-muted-foreground'>التكلفة الإجمالية:</span>
                                    <span className='font-bold text-primary dark:text-primary-foreground'>{(selectedPackage.price + selectedPackage.price * COMMISSION_RATE).toLocaleString('en-US')} ريال</span>
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurchase} disabled={isProcessing}>
                        {isProcessing ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الإرسال...</> : 'تأكيد وإرسال الطلب'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
}
