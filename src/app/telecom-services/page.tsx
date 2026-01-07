'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, RefreshCw, ChevronLeft, Loader2, Search, CheckCircle, CreditCard, AlertTriangle, Info, Calendar, Database, Smile, ThumbsDown } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, writeBatch, increment } from 'firebase/firestore';
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
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

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

type YemenMobileSolfa = {
    resultCode: string;
    message: string;
    status: string; // "1" for loan, "0" for no loan
    loan_amount: string;
    loan_time: string;
};

type Offer = {
    offerStartDate: string;
    offerName: string;
    offerId: string;
    offerEndDate: string;
};

type OfferWithPrice = Offer & { price?: number };

type Yemen4GQuery = {
    balance: string;
    exp_date: string;
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
    balanceData, 
    isLoadingBalance,
    solfaData,
    isLoadingSolfa,
    offers, 
    isLoadingOffers, 
    onPackageSelect,
    onBillPay,
    refreshBalanceAndSolfa 
}: { 
    balanceData: YemenMobileBalance | null, 
    isLoadingBalance: boolean,
    solfaData: YemenMobileSolfa | null,
    isLoadingSolfa: boolean,
    offers: OfferWithPrice[] | null,
    isLoadingOffers: boolean,
    onPackageSelect: (pkg: OfferWithPrice) => void,
    onBillPay: (amount: number) => void,
    refreshBalanceAndSolfa: () => void 
}) => {
    const [billAmount, setBillAmount] = useState('');
    const [activeSubscriptions, setActiveSubscriptions] = useState<OfferWithPrice[]>([]);

    const reverseText = (text: string) => {
        if (text && /[\u0600-\u06FF]/.test(text) && !/^[ \u0600-\u06FF]/.test(text)) {
           return text.split('').reverse().join('');
        }
        return text;
    };
    
    const offerCategories = {
        'باقات مزايا': ['مزايا'],
        'باقات فورجي': ['فورجي'],
        'باقات VoLTE': ['VoLTE'],
        'باقات الانترنت الشهرية': ['نت', 'شهري'],
        'باقات انترنت 10 أيام': ['نت', '10 أيّام'],
        'تواصل اجتماعي': ['تواصل'],
        'باقات أخرى': []
    };

    const categorizedOffers = useMemo(() => {
        if (!offers) return { available: {}, active: [] };
        
        const initializedCategories: Record<string, OfferWithPrice[]> = {
            'باقات مزايا': [],
            'باقات فورجي': [],
            'باقات VoLTE': [],
            'باقات الانترنت الشهرية': [],
            'باقات انترنت 10 أيام': [],
            'تواصل اجتماعي': [],
            'باقات أخرى': []
        };
        const active: OfferWithPrice[] = [];

        offers.forEach(offer => {
            const correctedName = reverseText(offer.offerName);
            const price = Number(correctedName.match(/\d+/g)?.join('')) || undefined;
            const offerWithDetails = { ...offer, offerName: correctedName, price };

            if (offer.offerId.startsWith('A')) { 
                active.push(offerWithDetails);
                return;
            }

            let assigned = false;
            for (const category in offerCategories) {
                if (category === 'باقات أخرى') continue;
                const keywords = (offerCategories as any)[category] as string[];
                
                const allKeywordsMatch = keywords.every(keyword => correctedName.includes(keyword));

                if (allKeywordsMatch) {
                    initializedCategories[category].push(offerWithDetails);
                    assigned = true;
                    break; 
                }
            }
            if (!assigned) {
                initializedCategories['باقات أخرى'].push(offerWithDetails);
            }
        });
        
        setActiveSubscriptions(active);

        const finalCategories: Record<string, OfferWithPrice[]> = {};
        for(const category in initializedCategories) {
            if(initializedCategories[category].length > 0) {
                finalCategories[category] = initializedCategories[category];
            }
        }

        return { available: finalCategories, active };

    }, [offers]);

    const isLoanActive = solfaData?.status === "1";
    
    const renderOfferIcon = (category: string) => {
        if (category.includes('فورجي') || category.includes('VoLTE')) return '4G';
        if (category.includes('مزايا') || category.includes('انترنت')) return '3G';
        if (category.includes('تواصل')) return <Smartphone className="w-4 h-4"/>;
        return <Database className="w-5 h-5"/>;
    }

    return (
    <div className="space-y-4 animate-in fade-in-0 duration-500" data-theme="yemen-mobile">
        
        <Card>
            <CardContent className="p-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <div className='p-2 rounded-lg bg-muted'>
                    <p className="text-muted-foreground mb-1">رصيد الرقم</p>
                    {isLoadingBalance ? <Skeleton className="h-4 w-10 mx-auto"/> : <p>{balanceData?.balance ?? 'تعذر الجلب'}</p>}
                </div>
                 <div className='p-2 rounded-lg bg-muted'>
                    <p className="text-muted-foreground mb-1">نوع الرقم</p>
                    {isLoadingBalance ? <Skeleton className="h-4 w-14 mx-auto"/> : <p>{balanceData?.mobileType === '0' ? 'دفع مسبق' : 'فاتورة'}</p>}
                </div>
                 <div className='p-2 rounded-lg bg-muted'>
                    <p className="text-muted-foreground mb-1">حالة السلفة</p>
                    {isLoadingSolfa ? <Skeleton className="h-4 w-12 mx-auto"/> : (
                        <div className={cn("flex items-center justify-center gap-1", isLoanActive ? 'text-destructive' : 'text-green-600')}>
                           {isLoanActive ? <ThumbsDown className="h-3 w-3"/> : <Smile className="h-3 w-3"/>}
                           <span>{isLoanActive ? 'متسلف' : 'غير متسلف'}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        
        {activeSubscriptions.length > 0 && (
            <Card>
                <CardHeader className="p-3">
                    <CardTitle className="text-sm">الاشتراكات الحالية</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                    {activeSubscriptions.map(sub => (
                        <div key={sub.offerId} className="p-3 rounded-lg border bg-accent/50">
                            <div className="flex justify-between items-start">
                                <div className='flex-1'>
                                    <p className="font-bold text-sm">{sub.offerName}</p>
                                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                        <p>الاشتراك: <span className="font-mono">{sub.offerStartDate}</span></p>
                                        <p>الانتهاء: <span className="font-mono">{sub.offerEndDate}</span></p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="p-2 bg-primary/10 rounded-full">
                                        <RefreshCw className="h-5 w-5 text-primary"/>
                                    </div>
                                    <Button size="sm" className="h-auto py-1 px-3 text-xs" onClick={() => onPackageSelect(sub)}>تجديد</Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}

        <Tabs defaultValue="packages" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="packages">الباقات</TabsTrigger>
                <TabsTrigger value="balance">الرصيد</TabsTrigger>
            </TabsList>
            <TabsContent value="packages" className="pt-4">
                 <Accordion type="single" collapsible className="w-full space-y-3" defaultValue={Object.keys(categorizedOffers.available)[0]}>
                    {Object.entries(categorizedOffers.available).map(([category, pkgs]) => (
                        <AccordionItem value={category} key={category} className="border-none">
                            <AccordionTrigger className="p-3 bg-primary text-primary-foreground rounded-lg hover:no-underline hover:bg-primary/90">
                                <div className='flex items-center gap-2'>
                                    <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold">
                                        {renderOfferIcon(category)}
                                    </div>
                                    <span>{category}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                                <div className="space-y-2">
                                {pkgs.map(pkg => (
                                    <Card key={pkg.offerId} onClick={() => onPackageSelect(pkg)} className="cursor-pointer hover:bg-muted/50">
                                        <CardContent className="p-3 flex justify-between items-center">
                                            <p className="font-semibold text-sm">{pkg.offerName}</p>
                                            {pkg.price && <p className="text-sm font-bold text-primary">{pkg.price.toLocaleString('en-US')} ريال</p>}
                                        </CardContent>
                                    </Card>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </TabsContent>
            <TabsContent value="balance" className="pt-4">
                <Card>
                    <CardHeader className="p-3">
                        <CardTitle className="text-base">تسديد الفواتير أو الرصيد</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-3">
                        <div>
                            <Label htmlFor="bill-amount" className="sr-only">المبلغ</Label>
                            <Input 
                                id="bill-amount"
                                type="number"
                                placeholder="أدخل المبلغ..."
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                            />
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={() => onBillPay(Number(billAmount))} 
                            disabled={!billAmount || Number(billAmount) <= 0}
                        >
                            <CreditCard className="ml-2 h-4 w-4" />
                            دفع
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
);
}

const Yemen4GUI = ({ 
    onBillPay, 
    queryData, 
    isLoadingQuery, 
    refreshQuery 
}: { 
    onBillPay: (amount: number, type: 'balance' | 'package') => void,
    queryData: Yemen4GQuery | null,
    isLoadingQuery: boolean,
    refreshQuery: () => void
}) => {
    const [billAmount, setBillAmount] = useState('');
    const [packageAmount, setPackageAmount] = useState('');
    
    return (
        <div className="space-y-4 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader className="flex-row items-center justify-between p-3">
                    <CardTitle className="text-sm">بيانات الرقم (يمن فورجي)</CardTitle>
                     <Button variant="ghost" size="icon" onClick={refreshQuery} disabled={isLoadingQuery}>
                        <RefreshCw className={`h-4 w-4 ${isLoadingQuery ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                    {isLoadingQuery ? (
                         <Skeleton className="h-8 w-full" />
                    ) : queryData ? (
                        <div className="flex justify-between items-center text-xs text-muted-foreground p-2 rounded-lg bg-muted">
                           <p>الرصيد: <strong>{queryData.balance}</strong></p>
                           {queryData.exp_date && <p className="flex items-center gap-1">الصلاحية: <strong>{format(parseISO(queryData.exp_date), 'd/M/yyyy', {locale: ar})}</strong></p>}
                        </div>
                    ) : (
                        <p className="text-center text-xs text-muted-foreground py-2">لا توجد بيانات لعرضها.</p>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="balance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="balance">الرصيد</TabsTrigger>
                    <TabsTrigger value="packages">الباقات</TabsTrigger>
                </TabsList>
                <TabsContent value="balance" className="pt-4">
                    <Card>
                        <CardHeader className="p-3">
                            <CardTitle className="text-base">تسديد رصيد</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-3">
                            <div>
                              <Label htmlFor="y4g-bill-amount" className="sr-only">المبلغ</Label>
                              <Input 
                                id="y4g-bill-amount"
                                type="number"
                                placeholder="أدخل مبلغ الرصيد..."
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                              />
                            </div>
                            <Button 
                                className="w-full" 
                                onClick={() => onBillPay(Number(billAmount), 'balance')} 
                                disabled={!billAmount || Number(billAmount) <= 0}
                            >
                                <CreditCard className="ml-2 h-4 w-4" />
                                تسديد رصيد
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="packages" className="pt-4">
                    <Card>
                        <CardHeader className="p-3">
                            <CardTitle className="text-base">شراء باقة</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0 space-y-3">
                            <div>
                              <Label htmlFor="y4g-package-amount" className="sr-only">المبلغ</Label>
                              <Input 
                                id="y4g-package-amount"
                                type="number"
                                placeholder="أدخل مبلغ الباقة..."
                                value={packageAmount}
                                onChange={(e) => setPackageAmount(e.target.value)}
                              />
                            </div>
                            <Button 
                                className="w-full" 
                                onClick={() => onBillPay(Number(packageAmount), 'package')} 
                                disabled={!packageAmount || Number(packageAmount) <= 0}
                            >
                                <CreditCard className="ml-2 h-4 w-4" />
                                شراء باقة
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}


export default function TelecomServicesPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [detectedOperator, setDetectedOperator] = useState<string | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [balanceData, setBalanceData] = useState<YemenMobileBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [solfaData, setSolfaData] = useState<YemenMobileSolfa | null>(null);
  const [isLoadingSolfa, setIsLoadingSolfa] = useState(false);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  
  const [yemen4gQueryData, setYemen4gQueryData] = useState<Yemen4GQuery | null>(null);
  const [isLoadingYemen4gQuery, setIsLoadingYemen4gQuery] = useState(false);
  
  const [selectedPackage, setSelectedPackage] = useState<OfferWithPrice | null>(null);
  const [billAmount, setBillAmount] = useState<number | null>(null);
  const [yemen4GType, setYemen4GType] = useState<'balance' | 'package' | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);


  const getOperator = (phone: string) => {
    if (phone.startsWith('77') || phone.startsWith('78')) return 'Yemen Mobile';
    if (phone.startsWith('73')) return 'SabaFon';
    if (phone.startsWith('71')) return 'YOU';
    if (phone.startsWith('70')) return 'Way';
    if (phone.startsWith('10')) return 'Yemen 4G';
    return null;
  };
  
  const getOperatorLogo = (operator: string | null) => {
      switch(operator) {
          case 'Yemen Mobile': return 'https://i.postimg.cc/90FqYx0x/yemen-mobile.png';
          case 'SabaFon': return 'https://i.postimg.cc/T1j31fnC/sabafon.png';
          case 'YOU': return 'https://i.postimg.cc/SN7B5Y3z/you.png';
          case 'Way': return 'https://i.postimg.cc/j5P7qJ62/logo-W-svg.png';
          case 'Yemen 4G': return 'https://i.postimg.cc/pT2x5nFB/yemen4g.png';
          default: return null;
      }
  }
  
  const fetchBalance = useCallback(async (phone: string) => {
      if (getOperator(phone) !== 'Yemen Mobile') return;

      setIsLoadingBalance(true);
      setBalanceData(null);
      try {
          const response = await fetch(`/api/echehanly?service=yem&action=query&mobile=${phone}`);
          const data = await response.json();
          if (!response.ok) {
              throw new Error(data.message || 'Failed to fetch balance');
          }
          setBalanceData(data);
      } catch (error: any) {
          console.error("Balance fetch error:", error);
          toast({ variant: 'destructive', title: 'خطأ', description: error.message });
          setBalanceData(null);
      } finally {
          setIsLoadingBalance(false);
      }
  }, [toast]);
  
  const fetchOffers = useCallback(async (phone: string) => {
    if (getOperator(phone) !== 'Yemen Mobile') return;
    setIsLoadingOffers(true);
    setOffers(null);
    try {
        const response = await fetch(`/api/echehanly?service=yem&action=queryoffer&mobile=${phone}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch offers');
        }
        setOffers(data.offers);
    } catch (error: any) {
        console.error("Offers fetch error:", error);
        toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        setOffers(null);
    } finally {
        setIsLoadingOffers(false);
    }
  }, [toast]);
  
  const fetchSolfa = useCallback(async (phone: string) => {
    if (getOperator(phone) !== 'Yemen Mobile') return;
    setIsLoadingSolfa(true);
    setSolfaData(null);
    try {
        const response = await fetch(`/api/echehanly?service=yem&action=solfa&mobile=${phone}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch loan status');
        }
        setSolfaData(data);
    } catch (error: any) {
        console.error("Solfa fetch error:", error);
        toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        setSolfaData(null);
    } finally {
        setIsLoadingSolfa(false);
    }
  }, [toast]);

  const fetchYemen4GQuery = useCallback(async (phone: string) => {
    if (getOperator(phone) !== 'Yemen 4G') return;
    setIsLoadingYemen4gQuery(true);
    setYemen4gQueryData(null);
    try {
        const response = await fetch(`/api/echehanly?service=yem4g&action=query&mobile=${phone}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch Yemen 4G data');
        }
        setYemen4gQueryData(data);
    } catch (error: any) {
        console.error("Yemen 4G query error:", error);
        toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        setYemen4gQueryData(null);
    } finally {
        setIsLoadingYemen4gQuery(false);
    }
  }, [toast]);

  useEffect(() => {
    const operator = getOperator(phoneNumber);
    if (operator !== detectedOperator) {
        setDetectedOperator(operator);
        setBalanceData(null);
        setOffers(null);
        setSolfaData(null);
        setYemen4gQueryData(null);
    }

    if (phoneNumber.length === 9 || (operator === 'Yemen 4G' && phoneNumber.length > 0)) {
      if (operator === 'Yemen Mobile') {
        fetchBalance(phoneNumber);
        fetchOffers(phoneNumber);
        fetchSolfa(phoneNumber);
      } else if (operator === 'Yemen 4G') {
        fetchYemen4GQuery(phoneNumber);
      } else if (operator) {
        toast({ title: "قريباً", description: `خدمات ${operator} قيد التطوير.`});
      }
    }
  }, [phoneNumber, detectedOperator, fetchBalance, fetchOffers, fetchSolfa, fetchYemen4GQuery, toast]);
  
  const handlePurchase = async () => {
    const isPackage = !!selectedPackage;
    const isYemen4G = detectedOperator === 'Yemen 4G';
    let amountToPay: number | undefined | null = isPackage ? selectedPackage?.price : billAmount;

    if (isYemen4G) {
        amountToPay = billAmount;
    }
    
    if (!amountToPay || amountToPay <= 0 || !userProfile || !firestore || !userDocRef || !user) {
        toast({ variant: 'destructive', title: "خطأ", description: "معلومات غير كافية لإتمام العملية." });
        setIsConfirming(false);
        return;
    }
    
    if ((userProfile.balance ?? 0) < amountToPay) {
        toast({ variant: "destructive", title: "رصيد غير كاف", description: `رصيدك الحالي لا يكفي ل${isPackage ? 'شراء هذه الباقة' : 'تسديد هذا المبلغ'}.` });
        setIsConfirming(false);
        return;
    }

    setIsProcessing(true);
    try {
        let apiUrl = `/api/echehanly?mobile=${phoneNumber}`;
        let serviceName: string = 'Yemen Mobile';
        let serviceType: string;

        if (isYemen4G) {
            serviceName = 'Yemen 4G';
            apiUrl += `&service=yem4g&action=bill&amount=${amountToPay}`;
            if(yemen4GType === 'package') {
                apiUrl += '&type=1';
                serviceType = 'شراء باقة 4G';
            } else {
                 apiUrl += '&type=2';
                 serviceType = 'تسديد رصيد 4G';
            }
        } else { // Yemen Mobile
            if (isPackage) {
                apiUrl += `&service=yem&action=billoffer&offerid=${selectedPackage!.offerId}&method=New`;
                serviceType = `شراء باقة: ${selectedPackage!.offerName}`;
            } else {
                apiUrl += `&service=yem&action=bill&amount=${amountToPay}`;
                serviceType = 'تسديد رصيد';
            }
        }
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'فشلت عملية الدفع لدى مزود الخدمة.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-amountToPay) });
        
        const requestData = {
          userId: user.uid,
          userName: userProfile.displayName,
          userPhoneNumber: userProfile.phoneNumber,
          company: serviceName,
          serviceType: serviceType,
          targetPhoneNumber: phoneNumber,
          amount: amountToPay,
          commission: 0, 
          totalCost: amountToPay,
          status: 'approved',
          requestTimestamp: new Date().toISOString()
        };
        const requestsCollection = collection(firestore, 'billPaymentRequests');
        batch.set(doc(requestsCollection), requestData);

        await batch.commit();
        
        setSuccessMessage(isPackage ? `تم تفعيل باقة "${selectedPackage?.offerName}" بنجاح.` : `تم تسديد مبلغ ${amountToPay.toLocaleString('en-US')} ريال بنجاح.`);
        setShowSuccess(true);

    } catch(error: any) {
        toast({ variant: 'destructive', title: 'فشل الدفع', description: error.message });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  }

  const renderOperatorUI = () => {
    switch (detectedOperator) {
      case 'Yemen Mobile':
        return <YemenMobileUI 
            balanceData={balanceData} 
            isLoadingBalance={isLoadingBalance}
            solfaData={solfaData}
            isLoadingSolfa={isLoadingSolfa}
            offers={offers}
            isLoadingOffers={isLoadingOffers}
            onPackageSelect={(pkg) => {
                if(!pkg.price) {
                    toast({variant: 'destructive', title: 'خطأ', description: 'هذه الباقة ليس لها سعر محدد ولا يمكن شراؤها.'});
                    return;
                }
                setSelectedPackage(pkg);
                setBillAmount(null);
                setYemen4GType(null);
                setIsConfirming(true);
            }}
             onBillPay={(amount) => {
                if(amount <= 0) {
                    toast({variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.'});
                    return;
                }
                setBillAmount(amount);
                setSelectedPackage(null);
                setYemen4GType(null);
                setIsConfirming(true);
            }}
            refreshBalanceAndSolfa={() => {
                fetchBalance(phoneNumber);
                fetchSolfa(phoneNumber);
            }}
        />;
      case 'Yemen 4G':
        return <Yemen4GUI 
            onBillPay={(amount, type) => {
                if(amount <= 0) {
                    toast({variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.'});
                    return;
                }
                setBillAmount(amount);
                setSelectedPackage(null);
                setYemen4GType(type);
                setIsConfirming(true);
            }}
            queryData={yemen4gQueryData}
            isLoadingQuery={isLoadingYemen4gQuery}
            refreshQuery={() => fetchYemen4GQuery(phoneNumber)}
        />;
      default:
        return null;
    }
  };
  
  const getConfirmationMessage = () => {
    if (detectedOperator === 'Yemen 4G') {
        const actionText = yemen4GType === 'package' ? 'شراء باقة' : 'تسديد رصيد';
        return `هل تريد بالتأكيد ${actionText} بمبلغ ${billAmount?.toLocaleString('en-US')} ريال للرقم ${phoneNumber}؟`;
    }
    if (selectedPackage) {
        return `هل تريد بالتأكيد شراء باقة "${selectedPackage.offerName}" بسعر ${selectedPackage.price?.toLocaleString('en-US')} ريال؟`;
    }
    return `هل تريد بالتأكيد تسديد مبلغ ${billAmount?.toLocaleString('en-US')} ريال إلى الرقم ${phoneNumber}؟`;
  }

  if (showSuccess) {
    return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
        <Card className="w-full max-w-sm text-center shadow-2xl">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold">تمت العملية بنجاح</h2>
                     <p className="text-sm text-muted-foreground">{successMessage}</p>
                    <div className="w-full pt-4">
                         <Button variant="outline" className="w-full" onClick={() => {
                            setShowSuccess(false);
                            setSelectedPackage(null);
                            setBillAmount(null);
                            setYemen4GType(null);
                            router.push('/login');
                         }}>العودة للرئيسية</Button>
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
          <CardHeader>
            <CardTitle className="text-center">ادخل رقم الهاتف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-12 flex items-center justify-center">
                    {(isLoadingBalance || isLoadingOffers || isLoadingSolfa || isLoadingYemen4gQuery) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : detectedOperator && getOperatorLogo(detectedOperator) ? (
                        <Image src={getOperatorLogo(detectedOperator)!} alt={detectedOperator} width={32} height={32} className="object-contain"/>
                    ) : (
                        <Search className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="7X XXX XXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="text-2xl text-center h-16 tracking-widest"
              />
            </div>
          </CardContent>
        </Card>
        
        {renderOperatorUI()}

      </div>
    </div>
    <Toaster />
    
     <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد العملية</AlertDialogTitle>
                    <AlertDialogDescription>
                       {getConfirmationMessage()}
                       {' '}سيتم خصم المبلغ من رصيدك.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurchase} disabled={isProcessing}>
                        {isProcessing ? 'جاري التنفيذ...' : 'تأكيد'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
