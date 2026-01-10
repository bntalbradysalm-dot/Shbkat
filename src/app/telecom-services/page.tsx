'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, RefreshCw, Loader2, Phone, CreditCard, AlertTriangle, Package, CheckCircle, Send } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';


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

type YemenMobileLoan = {
    message: string;
    status: string;
    loan_amount: string;
    loan_time: string;
    resultCode: string;
};

type Offer = {
    offerStartDate: string;
    offerName: string;
    offerId: string;
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

export default function TelecomServicesPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [balanceData, setBalanceData] = useState<YemenMobileBalance | null>(null);
  const [loanData, setLoanData] = useState<YemenMobileLoan | null>(null);
  const [offersData, setOffersData] = useState<Offer[] | null>(null);

  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  
  const [billAmount, setBillAmount] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [confirmationDetails, setConfirmationDetails] = useState({ type: '', title: '', description: '', amount: 0, offerName: '' });

  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const callApi = useCallback(async (action: string, params: Record<string, string> = {}) => {
    const url = new URLSearchParams({ service: 'yem', action, mobile: phoneNumber, ...params });
    try {
        const response = await fetch(`/api/echehanly?${url.toString()}`);
        const data = await response.json();
        if (data.resultCode !== '0' && !String(data.resultCode).startsWith('10')) {
            throw new Error(data.message || data.resultDesc || `فشل: ${action}`);
        }
        return data;
    } catch (error: any) {
        toast({ variant: 'destructive', title: `خطأ في ${action}`, description: error.message });
        return null;
    }
  }, [phoneNumber, toast]);

  const handleQueryBalance = async () => {
    if (phoneNumber.length !== 9) return;
    setIsLoadingBalance(true);
    setBalanceData(null);
    setLoanData(null);
    
    const [balanceResult, loanResult] = await Promise.all([
        callApi('query', { type: 'balance' }),
        callApi('query', { type: 'solfa' })
    ]);

    if (balanceResult) setBalanceData(balanceResult);
    if (loanResult) setLoanData(loanResult);
    setIsLoadingBalance(false);
  };
  
  const handleQueryOffers = async () => {
    if (phoneNumber.length !== 9) return;
    setIsLoadingOffers(true);
    setOffersData(null);
    const offersResult = await callApi('query', { type: 'offers'});
    if (offersResult && Array.isArray(offersResult.offers)) {
        setOffersData(offersResult.offers);
    } else if (offersResult) {
        setOffersData([]);
    }
    setIsLoadingOffers(false);
  };

  const handlePaymentInitiation = (type: 'balance' | 'package', amount: number, offer?: Offer) => {
     if (amount <= 0) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
        return;
    }
     if ((userProfile?.balance ?? 0) < amount) {
        toast({ variant: "destructive", title: "رصيد غير كاف", description: `رصيدك لا يكفي.` });
        return;
    }
    if (type === 'package' && offer) {
        const numericAmount = parseFloat(offer.offerName.match(/(\d+)/)?.[0] || '0');
        setSelectedOffer(offer);
        setConfirmationDetails({ type, title: 'تأكيد شراء الباقة', description: `هل تريد بالتأكيد شراء باقة "${offer.offerName}"؟`, amount: numericAmount, offerName: offer.offerName });
    } else {
        setConfirmationDetails({ type, title: 'تأكيد تسديد الرصيد', description: `هل تريد تسديد مبلغ ${amount.toLocaleString('en-US')} ريال؟`, amount, offerName: '' });
    }
    setIsConfirming(true);
  };
  
  const handleFinalConfirmation = async () => {
    if (!user || !userProfile || !firestore || !userDocRef || !userProfile.displayName || !userProfile.phoneNumber) return;
    setIsProcessing(true);
    
    const { type, amount } = confirmationDetails;

    try {
        const billResponse = await callApi('bill', { amount: String(amount) });
        if (!billResponse || !billResponse.sequenceId) {
            throw new Error('فشل تسديد المبلغ الأولي. لم يتم الحصول على معرف العملية.');
        }

        let finalMessage = `تم تسديد مبلغ ${amount.toLocaleString('en-US')} ريال بنجاح.`;
        
        if (type === 'package' && selectedOffer) {
            const offerResponse = await callApi('billoffer', { offerid: selectedOffer.offerId, transid: billResponse.sequenceId });
            if (!offerResponse) {
                throw new Error('تم خصم المبلغ ولكن فشل تفعيل الباقة. يرجى التواصل مع الدعم.');
            }
            finalMessage = `تم تفعيل باقة "${selectedOffer.offerName}" بنجاح.`;
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-amount) });

        const requestData = {
            userId: user.uid, userName: userProfile.displayName, userPhoneNumber: userProfile.phoneNumber,
            company: 'Yemen Mobile', serviceType: type === 'package' ? 'شراء باقة' : 'سداد فاتورة',
            targetPhoneNumber: phoneNumber, amount, commission: 0, totalCost: amount, status: 'approved',
            requestTimestamp: new Date().toISOString(), transid: billResponse.sequenceId,
        };
        batch.set(doc(collection(firestore, 'billPaymentRequests')), requestData);

        const transactionData = {
            userId: user.uid, transactionDate: new Date().toISOString(), amount,
            transactionType: type === 'package' ? `شراء باقة: ${selectedOffer!.offerName}` : 'سداد Yemen Mobile',
            recipientPhoneNumber: phoneNumber, notes: `إلى رقم: ${phoneNumber}`
        };
        batch.set(doc(collection(firestore, 'users', user.uid, 'transactions')), transactionData);

        await batch.commit();

        setShowSuccess(true);
        toast({ title: 'نجاح', description: finalMessage });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'فشل العملية', description: error.message });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
        setBillAmount('');
        setSelectedOffer(null);
    }
  }

  const getMobileTypeString = (type: string | undefined) => {
    if (type === '0') return 'دفع مسبق';
    if (type === '1') return 'فوترة';
    return 'غير معروف';
  };
  
  if (showSuccess) {
    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold">تمت العملية بنجاح</h2>
                        <p className="text-sm text-muted-foreground">{confirmationDetails.type === 'package' ? `تم شراء باقة "${confirmationDetails.offerName}" بنجاح.` : 'تم تسديد الرصيد بنجاح.'}</p>
                        <div className="w-full pt-4">
                            <Button variant="outline" onClick={() => { setShowSuccess(false); setPhoneNumber(''); setBalanceData(null); setLoanData(null); setOffersData(null); }}>العودة</Button>
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
                id="phoneNumber" type="tel" placeholder="ادخل رقم يمن موبايل..."
                value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="text-lg text-center h-12 tracking-wider px-12"
              />
            </div>
          </CardContent>
        </Card>
        
        {phoneNumber.length === 9 && (
            <Accordion type="single" collapsible className="w-full space-y-4" defaultValue="item-1">
                <AccordionItem value="item-1" className="border-none">
                    <AccordionTrigger onClick={handleQueryBalance} className="p-4 bg-card rounded-lg text-base font-semibold hover:no-underline shadow-lg">الاستعلام عن الرصيد والسلفة</AccordionTrigger>
                    <AccordionContent className="pt-4">
                         {isLoadingBalance ? <Skeleton className='h-32 w-full' /> : (
                             (balanceData || loanData) && (
                                <Card>
                                    <CardContent className="p-0">
                                      <Table>
                                          <TableBody>
                                              {balanceData && (
                                                  <>
                                                      <TableRow>
                                                          <TableCell className="font-semibold text-muted-foreground">رصيد الرقم</TableCell>
                                                          <TableCell className="font-bold text-left text-primary">{balanceData.balance} ريال</TableCell>
                                                      </TableRow>
                                                      <TableRow>
                                                          <TableCell className="font-semibold text-muted-foreground">نوع الرقم</TableCell>
                                                          <TableCell className="font-bold text-left">{getMobileTypeString(balanceData.mobileType)}</TableCell>
                                                      </TableRow>
                                                  </>
                                              )}
                                              {loanData && loanData.status === '1' && (
                                                  <TableRow>
                                                      <TableCell className="font-semibold text-muted-foreground text-orange-600">السلفة</TableCell>
                                                      <TableCell className="font-bold text-left text-orange-500">{loanData.loan_amount} ريال</TableCell>
                                                  </TableRow>
                                              )}
                                               {loanData && loanData.status === '0' && (
                                                  <TableRow>
                                                        <TableCell className="font-semibold text-muted-foreground">السلفة</TableCell>
                                                        <TableCell className="font-bold text-left text-green-600">لا توجد سلفة</TableCell>
                                                  </TableRow>
                                              )}
                                          </TableBody>
                                      </Table>
                                    </CardContent>
                                </Card>
                             )
                         )}
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-2" className="border-none">
                    <AccordionTrigger className="p-4 bg-card rounded-lg text-base font-semibold hover:no-underline shadow-lg">تسديد الرصيد</AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <Card>
                             <CardContent className="p-3 pt-3 space-y-3">
                                <div>
                                    <Label htmlFor="bill-amount">المبلغ</Label>
                                    <Input id="bill-amount" type="number" placeholder="أدخل المبلغ..." value={billAmount || ''} onChange={e => setBillAmount(e.target.value)} />
                                </div>
                                <Button className="w-full" onClick={() => handlePaymentInitiation('balance', Number(billAmount))} disabled={!billAmount || Number(billAmount) <= 0}>
                                    <CreditCard className="ml-2 h-4 w-4" /> تسديد
                                </Button>
                            </CardContent>
                        </Card>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-none">
                    <AccordionTrigger onClick={handleQueryOffers} className="p-4 bg-card rounded-lg text-base font-semibold hover:no-underline shadow-lg">شراء الباقات</AccordionTrigger>
                    <AccordionContent className="pt-4">
                         {isLoadingOffers ? <Skeleton className='h-40 w-full' /> : (
                             offersData && (
                                 <Card>
                                     <CardContent className="p-3 space-y-2">
                                        {offersData.length > 0 ? offersData.map(offer => (
                                            <div key={offer.offerId} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                                                <p className="text-sm font-semibold">{offer.offerName}</p>
                                                <Button size="sm" onClick={() => handlePaymentInitiation('package', 500, offer)}>شراء</Button>
                                            </div>
                                        )) : <p className="text-center text-muted-foreground p-4">لا توجد باقات متاحة لهذا الرقم.</p>}
                                     </CardContent>
                                 </Card>
                             )
                         )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        )}
      </div>
    </div>
    <Toaster />
    
     <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{confirmationDetails.title}</AlertDialogTitle>
                    <AlertDialogDescription>{confirmationDetails.description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalConfirmation} disabled={isProcessing}>
                        {isProcessing ? 'جاري التنفيذ...' : 'تأكيد'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
