

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, RefreshCw, Loader2, Phone, CreditCard } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
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
import { Label } from '@/components/ui/label';

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

type YemenMobileBalance = {
    mobileType: string;
    availableCredit: string;
    balance: string;
    resultDesc: string;
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

const YemenMobileUI = ({ 
    onBillPay,
    queryData, 
    isLoadingQuery, 
    refreshQuery 
}: { 
    onBillPay: (amount: number) => void,
    queryData: YemenMobileBalance | null,
    isLoadingQuery: boolean,
    refreshQuery: () => void 
}) => {
    const [billAmount, setBillAmount] = useState('');
    const getMobileTypeString = (type: string | undefined) => {
        if (type === '0') return 'دفع مسبق';
        if (type === '1') return 'فوترة';
        return 'غير معروف';
    }

    return (
        <div className="space-y-4 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader className="p-3 text-center">
                    <CardTitle className="text-base">بيانات الرقم (يمن موبايل)</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                     <Button onClick={refreshQuery} disabled={isLoadingQuery} className="w-full" variant="outline">
                        {isLoadingQuery ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="ml-2 h-4 w-4"/>}
                        {isLoadingQuery ? 'جاري الاستعلام...' : 'الاستعلام عن الرصيد'}
                    </Button>
                     {queryData && (
                        <Card className="bg-muted/50">
                            <CardContent className="p-3 text-xs grid grid-cols-2 gap-2">
                               <p>الرصيد: <strong>{queryData.balance} ريال</strong></p>
                               <p>نوع الخط: <strong>{getMobileTypeString(queryData.mobileType)}</strong></p>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="p-3 text-center">
                     <CardTitle className="text-base">تسديد الرصيد</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                    <div>
                        <Label htmlFor="bill-amount">المبلغ</Label>
                        <Input 
                            id="bill-amount"
                            type="number"
                            placeholder="أدخل المبلغ..."
                            value={billAmount}
                            onChange={e => setBillAmount(e.target.value)}
                        />
                    </div>
                    <Button 
                        className="w-full"
                        onClick={() => onBillPay(Number(billAmount))}
                        disabled={!billAmount || Number(billAmount) <= 0}
                    >
                        <CreditCard className="ml-2 h-4 w-4" />
                        تسديد
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

export default function TelecomServicesPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [queryData, setQueryData] = useState<YemenMobileBalance | null>(null);
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  
  const [billAmount, setBillAmount] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handleQuery = async () => {
    if (phoneNumber.length !== 9) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رقم هاتف صحيح (9 أرقام).' });
      return;
    }
    setIsLoadingQuery(true);
    setQueryData(null);
    try {
      const response = await fetch(`/api/echehanly?service=yem&action=query&mobile=${phoneNumber}&type=balance`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'فشل الاستعلام عن الرصيد.');
      }
      setQueryData(data);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: error.message });
    } finally {
      setIsLoadingQuery(false);
    }
  };

  const handlePaymentInitiation = (amount: number) => {
    if (amount <= 0) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
        return;
    }
     if ((userProfile?.balance ?? 0) < amount) {
        toast({ variant: "destructive", title: "رصيد غير كاف", description: `رصيدك الحالي لا يكفي لتسديد هذا المبلغ.` });
        return;
    }
    setBillAmount(amount);
    setIsConfirming(true);
  };
  
  const handleFinalPayment = async () => {
    if (!billAmount || billAmount <= 0 || !user || !userProfile || !firestore || !userDocRef) {
        setIsConfirming(false);
        return;
    }
    setIsProcessing(true);
    try {
        const response = await fetch(`/api/echehanly?service=yem&action=bill&mobile=${phoneNumber}&amount=${billAmount}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'فشلت عملية الدفع لدى مزود الخدمة.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-billAmount) });

        const requestData = {
            userId: user.uid,
            userName: userProfile.displayName,
            userPhoneNumber: userProfile.phoneNumber,
            company: 'Yemen Mobile',
            serviceType: 'سداد فاتورة',
            targetPhoneNumber: phoneNumber,
            amount: billAmount,
            commission: 0,
            totalCost: billAmount,
            status: 'approved',
            requestTimestamp: new Date().toISOString(),
            transid: data.transid || data.bill?.transid,
        };
        const requestsCollection = collection(firestore, 'billPaymentRequests');
        batch.set(doc(requestsCollection), requestData);

        const transactionData = {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: billAmount,
            transactionType: 'سداد Yemen Mobile',
            recipientPhoneNumber: phoneNumber,
            notes: `إلى رقم: ${phoneNumber}`
        };
        const transactionsCollection = collection(firestore, 'users', user.uid, 'transactions');
        batch.set(doc(transactionsCollection), transactionData);

        await batch.commit();

        toast({ title: 'نجاح', description: `تم تسديد مبلغ ${billAmount.toLocaleString('en-US')} ريال بنجاح.`});
        handleQuery(); // Refresh balance after payment

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'فشل الدفع', description: error.message });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
        setBillAmount(null);
    }
  }

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="كبينة السداد" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />

        <Card className="shadow-lg">
          <CardContent className="p-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-12 flex items-center justify-center">
                <Image src={'https://i.postimg.cc/52nxCtk5/images.png'} alt={"Yemen Mobile"} width={32} height={32} className="object-contain"/>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="ادخل رقم يمن موبايل..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="text-lg text-center h-12 tracking-wider px-12"
              />
            </div>
          </CardContent>
        </Card>
        
        {phoneNumber.length === 9 && (
            <YemenMobileUI
                onBillPay={handlePaymentInitiation}
                queryData={queryData}
                isLoadingQuery={isLoadingQuery}
                refreshQuery={handleQuery}
            />
        )}

      </div>
    </div>
    <Toaster />
    
     <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد العملية</AlertDialogTitle>
                    <AlertDialogDescription>
                       هل تريد بالتأكيد تسديد مبلغ {billAmount?.toLocaleString('en-US')} ريال للرقم {phoneNumber}؟
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalPayment} disabled={isProcessing}>
                        {isProcessing ? 'جاري التنفيذ...' : 'تأكيد'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
