

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, User, CheckCircle, Smartphone, Loader2, Package, Building2, Phone, Contact, RefreshCw, Smile, ThumbsDown, Database, MessageSquare, Briefcase, History } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

type UserProfile = {
  id: string;
  balance?: number;
  phoneNumber?: string;
  displayName?: string;
};

type BalanceResponse = {
    balance: string;
    mobile_type: string; // 0 for prepaid, 1 for postpaid
};

type Offer = {
    offerStartDate: string;
    offerName: string;
    offerId: string;
    offerEndDate: string;
};

type OfferDetails = {
  data?: string;
  minutes?: string;
  sms?: string;
  validity?: string;
  price: number;
}

type OfferWithPrice = Offer & OfferDetails & { id?: string };

const manualPackages: OfferWithPrice[] = [
    { name: 'باقة مزايا الاسبوعية', offerName: 'مزايا الاسبوعية', id: 'A64329', offerId: 'A64329', price: 485, data: '90 MB', sms: '30', minutes: '100', validity: '7 أيام', offerStartDate: '', offerEndDate: '' },
    { name: 'مزايا الشهرية', offerName: 'مزايا الشهرية', id: 'A38394', offerId: 'A38394', price: 1300, data: '250 MB', sms: '150', minutes: '350', validity: '30 يوم', offerStartDate: '', offerEndDate: '' },
    { name: 'مزايا ماكس الشهريه', offerName: 'مزايا ماكس الشهريه', id: 'A75328', offerId: 'A75328', price: 2000, data: '600 MB', sms: '200', minutes: '500', validity: '30 يوم', offerStartDate: '', offerEndDate: '' },
    { name: 'مزايا فورجي اليومية', offerName: 'مزايا فورجي اليومية', id: 'A88337', offerId: 'A88337', price: 600, data: '1 GB', sms: '30', minutes: '30', validity: '2 أيام', offerStartDate: '', offerEndDate: '' },
];


const presetAmounts = [100, 200, 500, 1000, 2000];

const parseOfferDetails = (name: string): Partial<OfferDetails> => {
    const details: Partial<OfferDetails> = {};
    const dataMatch = name.match(/(\d+)\s?(GB|MB|جيجا|ميجابايت|غيغا)/i);
    const minutesMatch = name.match(/(\d+)\s?(دقائق|دق|دقيقة)/i);
    const smsMatch = name.match(/(\d+)\s?(رسائل|رسالة|رس)/i);
    const validityMatch = name.match(/(يوم|أسبوع|شهر|يومين|أيام|اسبوع|شهري|اسبوعي)/i);
    
    if (dataMatch) details.data = `${dataMatch[1]} ${dataMatch[2].toUpperCase().startsWith('G') ? 'GB' : 'MB'}`;
    if (minutesMatch) details.minutes = minutesMatch[1];
    if (smsMatch) details.sms = smsMatch[1];
    if (validityMatch) details.validity = validityMatch[0];
  
    return details;
};

const formatApiDate = (dateString: string) => {
    if (!dateString || dateString.length < 14) return dateString; // YYYYMMDDHHMMSS
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = parseInt(dateString.substring(8, 10), 10);
    const minute = dateString.substring(10, 12);
    const ampm = hour >= 12 ? 'م' : 'ص';
    const formattedHour = hour % 12 || 12; // convert to 12-hour format
    return `${day}/${month}/${year} - ${String(formattedHour).padStart(2, '0')}:${minute} ${ampm}`;
};

const OfferDetailIcon = ({ icon: Icon, value, label }: { icon: React.ElementType, value?: string, label: string }) => {
    if (!value) return null;
    return (
        <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <Icon className="w-5 h-5" />
            <span className="text-xs font-semibold">{value}</span>
        </div>
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
  const [selectedPackage, setSelectedPackage] = useState<OfferWithPrice | null>(null);

  const [activeTab, setActiveTab] = useState('packages');
  
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);


  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  
  const fetchBalance = useCallback(async () => {
    if (!mobileNumber || mobileNumber.length !== 9) return;
    setIsLoadingBalance(true);
    try {
        const response = await fetch('/api/baity/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: mobileNumber }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'فشل جلب الرصيد');
        }
        setBalanceData(data.data);
    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "خطأ",
            description: error.message,
        });
    } finally {
        setIsLoadingBalance(false);
    }
  }, [mobileNumber, toast]);

  useEffect(() => {
    if (mobileNumber.length === 9) {
      fetchBalance();
    } else {
      setBalanceData(null);
    }
  }, [mobileNumber, fetchBalance]);


  const categorizedOffers = useMemo(() => {
    const initializedCategories: Record<string, OfferWithPrice[]> = {
        'مزايا فورجي': [],
        'باقات مزايا': [],
        'باقات الانترنت الشهرية': [],
        'باقات انترنت 10 أيام': [],
        'باقات تواصل اجتماعي': [],
        'باقات أخرى': [],
    };
    
    // Using only manual packages for now
    const allOffers = [...manualPackages];
    const uniqueOffers = Array.from(new Map(allOffers.map(o => [o.offerId || o.id, o])).values());

    uniqueOffers.forEach(offer => {
        const offerId = offer.offerId || offer.id;
        if (!offerId) return;

        const correctedName = offer.offerName || offer.name;
        const price = offer.price || parseFloat(correctedName.match(/(\d+(\.\d+)?)/)?.[0] || '0');
        const parsedDetails = { data: offer.data, sms: offer.sms, minutes: offer.minutes, validity: offer.validity };
        
        const offerWithDetails: OfferWithPrice = { ...offer, ...parsedDetails, offerId, name: correctedName, offerName: correctedName, price };

        if (correctedName.includes('مزايا فورجي')) initializedCategories['مزايا فورجي'].push(offerWithDetails);
        else if (correctedName.includes('مزايا')) initializedCategories['باقات مزايا'].push(offerWithDetails);
        else if (correctedName.includes('شهري')) initializedCategories['باقات الانترنت الشهرية'].push(offerWithDetails);
        else if (correctedName.includes('10 أيّام')) initializedCategories['باقات انترنت 10 أيام'].push(offerWithDetails);
        else if (correctedName.includes('تواصل')) initializedCategories['باقات تواصل اجتماعي'].push(offerWithDetails);
        else initializedCategories['باقات أخرى'].push(offerWithDetails);
    });

    const finalCategories: Record<string, OfferWithPrice[]> = {};
    for(const category in initializedCategories) {
        if(initializedCategories[category].length > 0) {
            finalCategories[category] = initializedCategories[category].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        }
    }
    
    return finalCategories;
}, []);

const renderOfferIcon = (category: string) => {
    if (category.includes('مزايا فورجي')) return <Briefcase className="w-5 h-5"/>;
    if (category.includes('مزايا')) return <Smile className="w-5 h-5"/>;
    if (category.includes('شهري')) return <Database className="w-5 h-5"/>;
    if (category.includes('10 أيّام')) return <History className="w-5 h-5"/>;
    if (category.includes('تواصل')) return <Send className="w-5 h-5"/>;
    return <Package className="w-5 h-5"/>;
}
  
  const handleConfirmClick = (type: 'balance' | 'package', pkg?: OfferWithPrice) => {
    const numericAmount = parseFloat(amount);
    const finalAmount = type === 'package' ? pkg?.price : numericAmount;

    if (!finalAmount || finalAmount <= 0) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء تحديد مبلغ أو باقة صالحة." });
        return;
    }
    if ((userProfile?.balance ?? 0) < finalAmount) {
      toast({ variant: "destructive", title: "رصيد غير كاف!", description: "رصيدك الحالي لا يكفي لإتمام هذه العملية." });
      return;
    }
    if (type === 'balance') {
      if (!mobileNumber || !amount || isNaN(numericAmount) || numericAmount <= 0) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم جوال ومبلغ صحيح." });
        return;
      }
      setConfirmationDetails({ title: 'تأكيد تسديد الرصيد', description: `سيتم تسديد مبلغ ${numericAmount.toLocaleString('en-US')} ريال للرقم ${mobileNumber}.`, type: 'balance' });
    } else if (type === 'package' && pkg) {
      if (!mobileNumber) {
        toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم الجوال أولاً." });
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
      requestBody = { mobile: mobileNumber, offerID: selectedPackage.offerId };
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

  const handleAmountButtonClick = (value: number) => {
    setAmount(String(value));
  };
  
  const TabButton = ({ value, label }: { value: string, label: string}) => (
    <Button
        variant={activeTab === value ? 'default' : 'ghost'}
        onClick={() => setActiveTab(value)}
        className={cn(
            'flex-1 rounded-full text-sm',
            activeTab === value ? 'bg-destructive text-destructive-foreground shadow-md' : 'bg-destructive/10 text-destructive'
        )}
    >
        {label}
    </Button>
  );
  
  const getMobileTypeString = (type: string | undefined) => {
    if (type === '0') return 'دفع مسبق';
    if (type === '1') return 'فوترة';
    return 'غير معروف';
  };

  return (
    <>
    <div className="flex flex-col h-full bg-background" style={{'--primary': '222 47% 11%', '--destructive': '340 84% 43%'} as React.CSSProperties}>
      <SimpleHeader title="رصيد وباقات" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        <Card className="rounded-2xl bg-destructive/10 p-4">
            <div className="flex items-center gap-3">
                <div className="flex-1 text-right">
                    <Label htmlFor="mobileNumber" className="text-xs text-muted-foreground">رقم الجوال</Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="7xxxxxxxx"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      disabled={isProcessing}
                      maxLength={9}
                      className="bg-transparent border-none text-lg h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-right"
                    />
                </div>
                 <div className="p-2 bg-white rounded-lg">
                    <Image src="https://i.postimg.cc/SN7B5Y3z/you.png" alt="Baity" width={28} height={28} className="object-contain" />
                </div>
            </div>
        </Card>
        
        {mobileNumber.length === 9 && (
          <div className="animate-in fade-in-0 duration-300">
            <div className="flex items-center gap-2 rounded-full bg-destructive/10 p-1 mb-4">
              <TabButton value="packages" label="باقات" />
              <TabButton value="balance" label="سداد" />
            </div>

            {activeTab === 'balance' && (
              <div className="space-y-4 animate-in fade-in-0 duration-300">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center text-base">تسديد الرصيد</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="grid grid-cols-3 gap-2">
                        {presetAmounts.map(pa => (
                            <Button key={pa} variant="outline" onClick={() => handleAmountButtonClick(pa)}>
                                {pa}
                            </Button>
                        ))}
                    </div>
                     <div>
                        <Label htmlFor="amount" className="text-right mb-1 block">أو أدخل مبلغ</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                  </CardContent>
                </Card>
                <Button 
                  className="w-full"
                  disabled={!amount || Number(amount) <= 0} 
                  onClick={() => handleConfirmClick('balance')}
                >
                  تسديد الرصيد
                </Button>
              </div>
            )}
            
            {activeTab === 'packages' && (
              <div className="animate-in fade-in-0 duration-300 space-y-4">
                  <Card>
                      <CardHeader className="p-3">
                          <CardTitle className="text-sm text-center">بيانات الرقم</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                         {isLoadingBalance ? <Skeleton className="h-16 w-full" /> : balanceData ? (
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-semibold text-muted-foreground">رصيد الرقم</TableCell>
                                        <TableCell className="font-bold text-left">{balanceData.balance} ريال</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold text-muted-foreground">نوع الرقم</TableCell>
                                        <TableCell className="font-bold text-left">{getMobileTypeString(balanceData.mobile_type)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                         ) : <p className="text-center text-muted-foreground py-4 text-sm">لم يتم العثور على بيانات للرقم.</p>}
                      </CardContent>
                  </Card>

                  <Accordion type="single" collapsible className="w-full space-y-3">
                      {Object.entries(categorizedOffers).map(([category, pkgs]) => (
                          <AccordionItem value={category} key={category} className="border-none">
                              <AccordionTrigger className="p-3 bg-destructive text-destructive-foreground rounded-lg hover:no-underline hover:bg-destructive/90">
                                  <div className='flex items-center justify-between w-full'>
                                      <span>{category}</span>
                                      <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
                                          {renderOfferIcon(category)}
                                      </div>
                                  </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2">
                                  <div className="space-y-2">
                                      {pkgs.map(pkg => (
                                          <Card key={pkg.offerId || pkg.id} onClick={() => handleConfirmClick('package', pkg)} className="cursor-pointer p-4 hover:bg-muted/50">
                                              <div className="flex flex-col items-center text-center">
                                                  <h4 className="font-bold text-base">{pkg.offerName}</h4>
                                                  <p className="text-2xl font-bold text-destructive my-2">{pkg.price.toLocaleString('en-US')} ريال</p>
                                              </div>
                                              <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                                                  <OfferDetailIcon icon={Database} value={pkg.data} label="Data" />
                                                  <OfferDetailIcon icon={MessageSquare} value={pkg.sms} label="SMS" />
                                                  <OfferDetailIcon icon={Phone} value={pkg.minutes} label="Minutes" />
                                                  <OfferDetailIcon icon={History} value={pkg.validity} label="Validity" />
                                              </div>
                                          </Card>
                                      ))}
                                  </div>
                              </AccordionContent>
                          </AccordionItem>
                      ))}
                  </Accordion>
              </div>
            )}
          </div>
        )}

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

