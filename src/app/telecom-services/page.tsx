'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, RefreshCw, ChevronLeft, Loader2, Search, CheckCircle, CreditCard } from 'lucide-react';
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

type Offer = {
    offerStartDate: string;
    offerName: string;
    offerId: string;
    offerEndDate: string;
};

type OfferWithPrice = Offer & { price?: number };


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
    offers, 
    isLoadingOffers, 
    onPackageSelect,
    onBillPay,
    refreshBalance 
}: { 
    balanceData: YemenMobileBalance | null, 
    isLoadingBalance: boolean,
    offers: OfferWithPrice[] | null,
    isLoadingOffers: boolean,
    onPackageSelect: (pkg: OfferWithPrice) => void,
    onBillPay: (amount: number) => void,
    refreshBalance: () => void
}) => {
    
    const [billAmount, setBillAmount] = useState('');
    
    // Reverse arabic names
    const reverseText = (text: string) => text.split('').reverse().join('');
    
    const offerCategories = {
        'باقات مزايا': ['مزايا'],
        'باقات فورجي': ['4G', 'فورجي'],
        'باقات الانترنت': ['نت'],
        'تواصل اجتماعي': ['تواصل']
    };

    const categorizedOffers = useMemo(() => {
        if (!offers) return {};
        const categories: Record<string, OfferWithPrice[]> = {};
        offers.forEach(offer => {
            const reversedName = reverseText(offer.offerName);
            let assigned = false;
            for (const category in offerCategories) {
                if (offerCategories[category as keyof typeof offerCategories].some(keyword => reversedName.includes(keyword))) {
                    if (!categories[category]) categories[category] = [];
                    categories[category].push({ ...offer, offerName: reversedName, price: Number(reversedName.match(/\d+/)?.[0]) || undefined });
                    assigned = true;
                    break;
                }
            }
            if (!assigned) {
                if (!categories['باقات أخرى']) categories['باقات أخرى'] = [];
                categories['باقات أخرى'].push({ ...offer, offerName: reversedName, price: Number(reversedName.match(/\d+/)?.[0]) || undefined });
            }
        });
        return categories;
    }, [offers]);

    return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
        <Card>
            <CardHeader className="flex-row items-center justify-between p-3">
                <CardTitle className="text-sm">بيانات الرقم</CardTitle>
                <Button variant="ghost" size="icon" onClick={refreshBalance} disabled={isLoadingBalance}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                {isLoadingBalance ? (
                    <Skeleton className="h-10 w-full" />
                ) : balanceData ? (
                    <div className="flex justify-between items-center text-xs text-muted-foreground p-2 rounded-lg bg-muted">
                        <p>الرصيد: <strong>{balanceData.balance}</strong></p>
                        <p>نوع الرقم: <strong>{balanceData.mobileType === "0" ? 'دفع مسبق' : 'فاتورة'}</strong></p>
                    </div>
                ) : (
                    <p className="text-center text-xs text-destructive">لم يتم العثور على بيانات الرصيد.</p>
                )}
            </CardContent>
        </Card>
        
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
                    تسديد المبلغ
                </Button>
            </CardContent>
        </Card>

        {isLoadingOffers ? (
            <Skeleton className="h-48 w-full"/>
        ) : Object.keys(categorizedOffers).length > 0 ? (
            Object.entries(categorizedOffers).map(([category, pkgs]) => (
                <Card key={category}>
                    <CardHeader className="p-3">
                        <CardTitle className="text-base">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 p-3 pt-0">
                        {pkgs.map(pkg => (
                            <div key={pkg.offerId} onClick={() => onPackageSelect(pkg)} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                                <p className="font-semibold text-sm">{pkg.offerName}</p>
                                {pkg.price && <p className="text-xs text-primary font-bold">{pkg.price.toLocaleString('en-US')} ريال</p>}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))
        ) : (
             <p className="text-center text-muted-foreground py-4">لا توجد باقات متاحة لهذا الرقم.</p>
        )}
    </div>
);
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
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  
  const [selectedPackage, setSelectedPackage] = useState<OfferWithPrice | null>(null);
  const [billAmount, setBillAmount] = useState<number | null>(null);
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
    if (phone.startsWith('77')) return 'Yemen Mobile';
    if (phone.startsWith('73')) return 'SabaFon';
    if (phone.startsWith('71')) return 'YOU';
    if (phone.startsWith('70')) return 'Way';
    return null;
  };
  
  const getOperatorLogo = (operator: string | null) => {
      switch(operator) {
          case 'Yemen Mobile': return 'https://i.postimg.cc/90FqYx0x/yemen-mobile.png';
          case 'SabaFon': return 'https://i.postimg.cc/T1j31fnC/sabafon.png';
          case 'YOU': return 'https://i.postimg.cc/SN7B5Y3z/you.png';
          case 'Way': return 'https://i.postimg.cc/j5P7qJ62/logo-W-svg.png';
          default: return null;
      }
  }
  
  const fetchBalance = useCallback(async (phone: string) => {
      if (getOperator(phone) !== 'Yemen Mobile') return;

      setIsLoadingBalance(true);
      setBalanceData(null);
      try {
          const response = await fetch(`/api/echehanly?action=query&mobile=${phone}`);
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
        const response = await fetch(`/api/echehanly?action=queryoffer&mobile=${phone}`);
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

  useEffect(() => {
    const operator = getOperator(phoneNumber);
    if (operator !== detectedOperator) {
        setDetectedOperator(operator);
        setBalanceData(null);
        setOffers(null);
    }

    if (phoneNumber.length === 9) {
      if (operator === 'Yemen Mobile') {
        fetchBalance(phoneNumber);
        fetchOffers(phoneNumber);
      } else if (operator) {
        toast({ title: "قريباً", description: `خدمات ${operator} قيد التطوير.`});
      }
    }
  }, [phoneNumber, detectedOperator, fetchBalance, fetchOffers, toast]);
  
  const handlePurchase = async () => {
    const isPackage = !!selectedPackage;
    const amountToPay = isPackage ? selectedPackage?.price : billAmount;
    
    if (!amountToPay || amountToPay <= 0 || !userProfile || !firestore || !userDocRef || !user) {
        toast({ variant: 'destructive', title: "خطأ", description: "معلومات غير كافية لإتمام العملية." });
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
        if (isPackage) {
            apiUrl += `&action=billoffer&offerid=${selectedPackage!.offerId}&method=New`;
        } else {
            apiUrl += `&action=bill&amount=${amountToPay}`;
        }
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'فشلت عملية الدفع.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-amountToPay) });
        
        const requestData = {
          userId: user.uid,
          userName: userProfile.displayName,
          userPhoneNumber: userProfile.phoneNumber,
          company: 'Yemen Mobile',
          serviceType: isPackage ? `شراء باقة: ${selectedPackage?.offerName}` : 'تسديد رصيد',
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
            offers={offers}
            isLoadingOffers={isLoadingOffers}
            onPackageSelect={(pkg) => {
                if(!pkg.price) {
                    toast({variant: 'destructive', title: 'خطأ', description: 'هذه الباقة ليس لها سعر محدد ولا يمكن شراؤها.'});
                    return;
                }
                setSelectedPackage(pkg);
                setBillAmount(null);
                setIsConfirming(true);
            }}
             onBillPay={(amount) => {
                if(amount <= 0) {
                    toast({variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.'});
                    return;
                }
                setBillAmount(amount);
                setSelectedPackage(null);
                setIsConfirming(true);
            }}
            refreshBalance={() => fetchBalance(phoneNumber)}
        />;
      default:
        return null;
    }
  };

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
                    {(isLoadingBalance || isLoadingOffers) ? (
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
                       {selectedPackage ? `هل تريد بالتأكيد شراء باقة "${selectedPackage.offerName}" بسعر ${selectedPackage.price?.toLocaleString('en-US')} ريال؟`
                        : `هل تريد بالتأكيد تسديد مبلغ ${billAmount?.toLocaleString('en-US')} ريال إلى الرقم ${phoneNumber}؟`
                       }
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
