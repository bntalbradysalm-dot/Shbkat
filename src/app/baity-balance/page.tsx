
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, User, CheckCircle, Smartphone, Loader2, Package, Building2 } from 'lucide-react';
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
import { doc, writeBatch, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserProfile = {
  id: string;
  balance?: number;
  phoneNumber?: string;
  displayName?: string;
};

// Updated packages list
const baityPackages = [
    { id: 'A64329', name: 'باقة مزايا الاسبوعية', price: 485 },
    { id: 'A38394', name: 'باقة مزايا الشهرية', price: 1300 },
    { id: 'A75328', name: 'مزايا ماكس الشهرية', price: 2000 },
    { id: 'A76328', name: 'الشهرية للفوترة', price: 3000 },
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

export default function BaityServicesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [mobileNumber, setMobileNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmationDetails, setConfirmationDetails] = useState({ title: '', description: '', type: '' });
  const [selectedPackage, setSelectedPackage] = useState<{ id: string; name: string; price: number } | null>(null);
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  
  useEffect(() => {
    const handleSearch = async () => {
      if (mobileNumber.length !== 9 || !firestore) {
        setRecipient(null);
        return;
      }
      
      setIsSearching(true);
      setRecipient(null);

      try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('phoneNumber', '==', mobileNumber));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const recipientData = querySnapshot.docs[0].data() as UserProfile;
            setRecipient(recipientData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    };
    
    const timerId = setTimeout(() => {
        handleSearch();
    }, 500);

    return () => clearTimeout(timerId);

  }, [mobileNumber, firestore]);
  
  const handleConfirmClick = (type: 'balance' | 'package', pkg?: typeof baityPackages[0]) => {
    const numericAmount = parseFloat(amount);

    if (type === 'balance') {
      if (!mobileNumber || !amount || isNaN(numericAmount) || numericAmount <= 0) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم جوال ومبلغ صحيح." });
        return;
      }
      if ((userProfile?.balance ?? 0) < numericAmount) {
        toast({ variant: "destructive", title: "رصيد غير كاف!", description: "رصيدك الحالي لا يكفي لإتمام هذه العملية." });
        return;
      }
      setConfirmationDetails({ title: 'تأكيد تسديد الرصيد', description: `سيتم تسديد مبلغ ${numericAmount.toLocaleString('en-US')} ريال للرقم ${mobileNumber}.`, type: 'balance' });
    } else if (type === 'package' && pkg) {
      if (!mobileNumber) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم الجوال أولاً." });
        return;
      }
      if ((userProfile?.balance ?? 0) < pkg.price) {
        toast({ variant: "destructive", title: "رصيد غير كاف!", description: "رصيدك لا يكفي لشراء هذه الباقة." });
        return;
      }
      setSelectedPackage(pkg);
      setConfirmationDetails({ title: 'تأكيد شراء الباقة', description: `سيتم شراء باقة "${pkg.name}" بسعر ${pkg.price.toLocaleString('en-US')} ريال للرقم ${mobileNumber}.`, type: 'package' });
    }
    
    setIsConfirming(true);
  };

  const handleFinalConfirmation = async () => {
    if (!user || !userProfile || !firestore || !userDocRef) return;

    setIsProcessing(true);
    let apiEndpoint = '';
    let requestBody: any = {};
    let transactionNotes = '';
    let transactionAmount = 0;

    if (confirmationDetails.type === 'balance') {
      transactionAmount = parseFloat(amount);
      apiEndpoint = '/api/baity';
      requestBody = { mobile: mobileNumber, amount: transactionAmount };
      transactionNotes = `تسديد رصيد بيتي إلى رقم: ${mobileNumber}`;
    } else if (confirmationDetails.type === 'package' && selectedPackage) {
      transactionAmount = selectedPackage.price;
      apiEndpoint = '/api/baity-offer';
      requestBody = { mobile: mobileNumber, offerID: selectedPackage.id };
      transactionNotes = `شراء باقة بيتي: ${selectedPackage.name}`;
    } else {
        setIsProcessing(false);
        return;
    }

    try {
      const apiResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(result.message || 'فشل تنفيذ الطلب لدى مزود الخدمة.');
      }

      const batch = writeBatch(firestore);
      batch.update(userDocRef, { balance: increment(-transactionAmount) });
      const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      batch.set(transactionRef, {
        userId: user.uid,
        transactionDate: new Date().toISOString(),
        amount: transactionAmount,
        transactionType: confirmationDetails.type === 'balance' ? 'تسديد رصيد بيتي' : 'شراء باقة بيتي',
        notes: transactionNotes
      });

      await batch.commit();
      setShowSuccess(true);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "فشل تنفيذ الطلب",
            description: error.message || "حدث خطأ أثناء محاولة تنفيذ العملية.",
        });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
        setSelectedPackage(null);
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
                         <p className="text-sm text-muted-foreground">{confirmationDetails.type === 'balance' ? 'تم تسديد الرصيد بنجاح.' : 'تم شراء الباقة بنجاح.'}</p>
                        <div className="w-full pt-4">
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
          <CardContent className="p-3">
              <Label htmlFor="mobileNumber" className="text-muted-foreground flex items-center gap-2 mb-1 px-1">
                <Smartphone className="h-4 w-4" />
                رقم الجوال
              </Label>
              <div className="relative">
                <Input
                  id="mobileNumber"
                  type="tel"
                  placeholder="7xxxxxxxx"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  disabled={isProcessing}
                  maxLength={9}
                  className="text-center h-12 text-lg tracking-wider"
                />
                 {isSearching && <Loader2 className="animate-spin absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
              </div>
              {recipient && (
                <div className="mt-2 p-2 bg-muted rounded-lg flex items-center justify-center gap-2 animate-in fade-in-0 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold text-primary dark:text-primary-foreground">{recipient.displayName}</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="balance" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="balance"><Building2 className="ml-2 h-4 w-4" /> تسديد رصيد</TabsTrigger>
            <TabsTrigger value="packages"><Package className="ml-2 h-4 w-4" /> شراء باقات</TabsTrigger>
          </TabsList>
          
          <TabsContent value="balance" className="pt-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-center">تسديد رصيد</CardTitle>
                <CardDescription className="text-center">أدخل المبلغ المطلوب تسديده.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <Button onClick={() => handleConfirmClick('balance')} className="w-full h-auto py-3 text-base" disabled={!mobileNumber || !amount || isProcessing}>
                    {isProcessing && confirmationDetails.type === 'balance' ? <Loader2 className="ml-2 h-5 w-5 animate-spin"/> : <Send className="ml-2 h-5 w-5"/>}
                    {isProcessing && confirmationDetails.type === 'balance' ? 'جاري التسديد...' : 'تسديد الرصيد'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="pt-4">
            <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="text-center">شراء باقات</CardTitle>
                  <CardDescription className="text-center">اختر الباقة التي تريد شراءها.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                  {baityPackages.map((pkg) => (
                      <Card key={pkg.id} className="p-3">
                          <div className="flex justify-between items-center">
                              <div className='font-semibold'>{pkg.name}</div>
                              <Button onClick={() => handleConfirmClick('package', pkg)} disabled={!mobileNumber || isProcessing}>
                                {isProcessing && selectedPackage?.id === pkg.id ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : `${pkg.price.toLocaleString('en-US')} ريال`}
                              </Button>
                          </div>
                      </Card>
                  ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    <Toaster />

    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center">{confirmationDetails.title}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div className="space-y-4 pt-4 text-base text-foreground text-center">
                         <p className="text-sm text-center text-muted-foreground pb-2">{confirmationDetails.description}</p>
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

    