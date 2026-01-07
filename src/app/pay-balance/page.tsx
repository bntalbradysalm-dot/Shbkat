
'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Wallet, Phone, CheckCircle, Loader2, CreditCard, Send, Smartphone, Building } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

const companies = [
    { id: 'yemen-mobile', name: 'يمن موبايل', logo: 'https://i.postimg.cc/90FqYx0x/yemen-mobile.png', commission: 0.05 },
    { id: 'you', name: 'YOU', logo: 'https://i.postimg.cc/50p2XJzS/download.png', commission: 0 },
    { id: 'sabafon', name: 'سبأفون', logo: 'https://i.postimg.cc/pT3Y9YvF/sabafon.png', commission: 0 },
    { id: 'way', name: 'واي', logo: 'https://i.postimg.cc/RhBcgqLh/unnamed.png', commission: 0 },
];

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

export default function PaymentBoothPage() {
  const [selectedCompany, setSelectedCompany] = useState(companies[0]);
  const [serviceType, setServiceType] = useState('فاتورة');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  
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

  const numericAmount = parseFloat(amount) || 0;
  const commission = numericAmount * selectedCompany.commission;
  const totalCost = numericAmount + commission;
  const balance = userProfile?.balance ?? 0;

  const isButtonDisabled = !phoneNumber || numericAmount <= 0;

  const handlePurchase = async () => {
    if (!user || !userProfile || !firestore || !userDocRef || !userProfile.displayName || !userProfile.phoneNumber) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن إتمام العملية، بيانات المستخدم غير مكتملة.' });
        return;
    }
  
    setIsProcessing(true);
    
    if (balance < totalCost) {
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
  
      // 2. Create a bill payment request document
      const paymentRequestRef = doc(collection(firestore, 'billPaymentRequests'));
      batch.set(paymentRequestRef, {
        userId: user.uid,
        userName: userProfile.displayName,
        userPhoneNumber: userProfile.phoneNumber,
        company: selectedCompany.name,
        serviceType: serviceType,
        targetPhoneNumber: phoneNumber,
        amount: numericAmount,
        commission: commission,
        totalCost: totalCost,
        status: 'pending',
        requestTimestamp: new Date().toISOString(),
      });
  
      await batch.commit();
      setShowSuccess(true);
    } catch (error) {
      console.error("Payment failed:", error);
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
                                <span className="text-muted-foreground">الخدمة:</span>
                                <span className="font-semibold">{selectedCompany.name} - {serviceType}</span>
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
                                setPhoneNumber('');
                                setAmount('');
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
        <SimpleHeader title="كبينة السداد" />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <BalanceDisplay />

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-center">اختر الشركة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-2">
                 {companies.map((company) => (
                    <button
                        key={company.id}
                        onClick={() => setSelectedCompany(company)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-2 rounded-xl p-2 aspect-square cursor-pointer transition-all border-2",
                            selectedCompany.id === company.id
                                ? 'border-primary shadow-md bg-primary/10'
                                : 'border-transparent opacity-60 hover:opacity-100 hover:bg-muted/50'
                        )}
                    >
                        <Image src={company.logo} alt={company.name} width={40} height={40} className="rounded-lg object-contain bg-white p-1" />
                        <p className="text-center text-[10px] font-semibold">{company.name}</p>
                    </button>
                 ))}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg animate-in fade-in-0 duration-500">
             <CardHeader>
                <CardTitle className="text-center">تفاصيل السداد</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <Tabs value={serviceType} onValueChange={setServiceType} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="فاتورة">فاتورة</TabsTrigger>
                        <TabsTrigger value="دفع مسبق">دفع مسبق</TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="space-y-2">
                    <Label htmlFor="phone-number" className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        رقم الهاتف
                    </Label>
                    <Input
                        id="phone-number"
                        type="tel"
                        placeholder="ادخل الرقم المراد سداده"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        المبلغ
                    </Label>
                    <Input
                        id="amount"
                        type="number"
                        inputMode='numeric'
                        placeholder="ادخل المبلغ"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                {numericAmount > 0 && (
                    <div className="text-xs bg-muted p-2 rounded-md space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">المبلغ:</span>
                            <span>{numericAmount.toLocaleString('en-US')} ريال</span>
                        </div>
                        {commission > 0 && <div className="flex justify-between">
                            <span className="text-muted-foreground">العمولة ({selectedCompany.commission * 100}%):</span>
                            <span>{commission.toLocaleString('en-US')} ريال</span>
                        </div>}
                        <div className="flex justify-between font-bold border-t pt-1 mt-1">
                            <span className="text-muted-foreground">الإجمالي:</span>
                            <span className="text-primary">{totalCost.toLocaleString('en-US')} ريال</span>
                        </div>
                    </div>
                )}

                 <Button className="w-full" onClick={() => setIsConfirming(true)} disabled={isButtonDisabled}>
                    <Send className="ml-2 h-4 w-4" />
                    إرسال طلب السداد
                 </Button>

             </CardContent>
          </Card>

        </div>
      </div>
      <Toaster />

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        {numericAmount > 0 && (
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">تأكيد عملية السداد</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className='space-y-3 text-center pt-2'>
                             <p>
                                هل أنت متأكد من سداد مبلغ <span className="font-bold">{numericAmount.toLocaleString('en-US')} ريال</span>
                                {' '}لرقم الهاتف <span className='font-bold'>{phoneNumber}</span>؟
                            </p>
                            <div className="text-sm bg-muted p-3 rounded-lg text-right space-y-2">
                                <div className="flex justify-between">
                                    <span className='text-muted-foreground'>الشركة:</span>
                                    <span className='font-semibold'>{selectedCompany.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className='text-muted-foreground'>نوع الخدمة:</span>
                                    <span className='font-semibold'>{serviceType}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 mt-2">
                                    <span className='text-muted-foreground'>التكلفة الإجمالية:</span>
                                    <span className='font-bold text-primary'>{totalCost.toLocaleString('en-US')} ريال</span>
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurchase} disabled={isProcessing || balance < totalCost}>
                        {isProcessing ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جاري الإرسال...</> : 'تأكيد وإرسال الطلب'}
                    </AlertDialogAction>
                </AlertDialogFooter>
                 {balance < totalCost && <p className="text-center text-xs text-destructive font-semibold pt-2">رصيدك غير كافٍ لإتمام هذه العملية.</p>}
            </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
}

    