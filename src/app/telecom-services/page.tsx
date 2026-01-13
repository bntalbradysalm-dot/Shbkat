'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Contact, Wallet, Phone, RefreshCw, Loader2, CheckCircle, Info, Tag, Package, AlertCircle } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where, writeBatch, increment } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';


type Transaction = {
    id: string;
    transactionType: string;
    recipientPhoneNumber?: string;
};

type Company = {
  name: string;
  icon: string | React.ElementType;
  theme: string;
};

const companyMap: Record<string, Company> = {
    'yemen-mobile': {
        name: 'يمن موبايل',
        icon: 'https://i.postimg.cc/52nxCtk5/images.png',
        theme: 'yemen-mobile'
    },
    'yemen-4g': {
        name: 'يمن فورجي',
        icon: 'https://i.postimg.cc/d1qWc06N/Yemen-4g-logo.png',
        theme: 'yemen-4g'
    }
};


type UserProfile = {
    balance?: number;
    displayName?: string;
    phoneNumber?: string;
};

const getCompanyFromNumber = (phone: string): Company | null => {
  if (!phone) return null;

  if (phone.length === 9 && (phone.startsWith('77') || phone.startsWith('78'))) {
      return companyMap['yemen-mobile'];
  }
   if (phone.length === 9 && phone.startsWith('10')) {
      return companyMap['yemen-4g'];
  }
  
  return null;
};

type PhoneInfo = {
    balance?: string;
    solfa?: string;
    isLoaned?: boolean;
};

type Offer = {
    offerName: string;
    offerId: string;
    offerStartDate: string;
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

const ServiceUI = ({ phoneNumber, company }: { phoneNumber: string, company: Company }) => {
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [finalBalance, setFinalBalance] = useState(0);
    const [isConfirming, setIsConfirming] = useState(false);
    
    // State for phone info queries
    const [isQueryingInfo, setIsQueryingInfo] = useState(false);
    const [phoneInfo, setPhoneInfo] = useState<PhoneInfo>({});
    const [queryInfoError, setQueryInfoError] = useState<string | null>(null);

    // State for offers query
    const [isQueryingOffers, setIsQueryingOffers] = useState(false);
    const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
    const [queryOffersError, setQueryOffersError] = useState<string | null>(null);
    const [isActivatingOffer, setIsActivatingOffer] = useState<string | null>(null);


    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const userDocRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);
    
    const isYemenMobile = company.name === 'يمن موبايل';

    const netAmount = useMemo(() => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) return '0.00';
        const taxDeduction = 0.174; // 17.4%
        const finalAmount = numericAmount * (1 - taxDeduction);
        return finalAmount.toFixed(2);
    }, [amount]);
    
    const queryPhoneInfo = useCallback(async () => {
        if (!isYemenMobile) return;
        setIsQueryingInfo(true);
        setQueryInfoError(null);
        setPhoneInfo({});

        try {
             const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'query',
                    mobile: phoneNumber,
                })
            });

            const data = await response.json();
            if (!response.ok || data.resultCode !== "0") {
                throw new Error(data.message || data.resultDesc || 'فشل الاستعلام عن الرصيد');
            }
            
            setPhoneInfo({
                balance: data.balance || 'غير متوفر',
                solfa: data.isLoaned ? 'متسلف' : 'غير متسلف',
                isLoaned: data.isLoaned
            });

        } catch (error: any) {
            setQueryInfoError('لم تظهر السلفة ولا بيانات الرقم');
        } finally {
            setIsQueryingInfo(false);
        }
    }, [phoneNumber, isYemenMobile]);
    
    const queryOffers = useCallback(async () => {
        if (!isYemenMobile) return;
        setIsQueryingOffers(true);
        setQueryOffersError(null);
        setAvailableOffers([]);
        
        try {
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'queryoffer',
                    mobile: phoneNumber,
                })
            });
            const data = await response.json();
            if (!response.ok || data.resultCode !== "0") {
                 throw new Error(data.message || data.resultDesc || 'فشل جلب العروض');
            }
            setAvailableOffers(data.offers || []);
        } catch (error: any) {
            setQueryOffersError(error.message);
        } finally {
            setIsQueryingOffers(false);
        }

    }, [phoneNumber, isYemenMobile]);

    useEffect(() => {
        if (phoneNumber.length === 9 && isYemenMobile) {
            queryPhoneInfo();
            queryOffers();
        }
    }, [phoneNumber, queryPhoneInfo, queryOffers, isYemenMobile]);

    const handleActivateOffer = async (offer: Offer) => {
        if (!user || !userProfile || !firestore || !userDocRef) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن التحقق من المستخدم.' });
            return;
        }
        
        setIsActivatingOffer(offer.offerId);

        try {
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'billover',
                    mobile: phoneNumber,
                    offerid: offer.offerId,
                    method: 'new'
                })
            });

            const data = await response.json();
             if (!response.ok || data.resultCode !== "0") {
                throw new Error(data.message || data.resultDesc || 'فشل تفعيل العرض');
            }
            
            toast({
                title: 'نجاح',
                description: `تم تفعيل عرض "${offer.offerName}" بنجاح.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'فشل التفعيل',
                description: error.message,
            });
        } finally {
            setIsActivatingOffer(null);
        }
    };


    const handlePayment = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صالح للتسديد.' });
            return;
        }

        if (isYemenMobile && numericAmount < 21) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'أقل مبلغ للسداد هو 21 ريال.' });
            return;
        }

        if (!user || !userProfile || !firestore || !userDocRef) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن التحقق من المستخدم. الرجاء إعادة المحاولة.' });
            return;
        }

        if ((userProfile.balance ?? 0) < numericAmount) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام هذه العملية.' });
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bill',
                    mobile: phoneNumber,
                    amount: numericAmount,
                })
            });

            const data = await response.json();
            
            if (!response.ok || data.resultCode !== "0") {
                throw new Error(data.message || data.resultDesc || 'فشلت عملية السداد.');
            }

            const currentBalance = userProfile.balance ?? 0;
            const newBalance = currentBalance - numericAmount;

            const batch = writeBatch(firestore);

            batch.update(userDocRef, { balance: increment(-numericAmount) });

            const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
            batch.set(transactionRef, {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: numericAmount,
                transactionType: `سداد ${company.name}`,
                notes: `إلى رقم: ${phoneNumber}`,
                recipientPhoneNumber: phoneNumber,
                transid: data.transid
            });

            await batch.commit();
            
            setFinalBalance(newBalance);
            setShowSuccess(true);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'فشلت عملية السداد',
                description: error.message,
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
                        <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold">تم السداد بنجاح</h2>
                        <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2">
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">المبلغ:</span>
                                <span className="font-semibold text-destructive">{Number(amount).toLocaleString('en-US')} ريال</span>
                            </div>
                           <div className="flex justify-between">
                                <span className="text-muted-foreground">رصيدك المتبقي:</span>
                                <span className="font-semibold">{finalBalance.toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                        <div className="w-full pt-4">
                            <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      );
    }


    return (
        <div className="space-y-4 animate-in fade-in-0 duration-500">
             <Tabs defaultValue="balance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="balance">الرصيد</TabsTrigger>
                    <TabsTrigger value="packages">الباقات</TabsTrigger>
                </TabsList>
                <TabsContent value="balance" className="mt-4">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                             <div className="text-right space-y-1">
                                <Label htmlFor="amount" className="text-muted-foreground">ادخل المبلغ</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    inputMode='numeric'
                                    placeholder="0.00"
                                    className="text-right"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                             </div>
                             {isYemenMobile && (
                                <div className="text-right space-y-1">
                                    <Label htmlFor="netAmount" className="text-muted-foreground">صافي الرصيد بعد خصم الضريبة</Label>
                                    <Input
                                        id="netAmount"
                                        type="text"
                                        readOnly
                                        value={netAmount}
                                        className="text-right mt-1 bg-muted font-bold text-primary"
                                    />
                                </div>
                             )}
                             <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                                <AlertDialogTrigger asChild>
                                  <Button className="w-full" disabled={isProcessing || !amount}>
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
                                      <span className="font-bold text-primary">{phoneNumber}</span>؟
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
                </TabsContent>
                <TabsContent value="packages" className="mt-4 space-y-4">
                     {isYemenMobile && (
                        <Card>
                             <CardContent className="p-0">
                                {isQueryingInfo ? (
                                    <div className="p-4 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                    </div>
                                ) : queryInfoError ? (
                                    <div className="p-3 text-center text-destructive text-sm flex items-center justify-center gap-2">
                                       <Info className="h-4 w-4" /> لم تظهر السلفة ولا بينانتات رقم
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {phoneInfo.balance && <div className="flex justify-between items-center p-3 text-sm">
                                            <span className="text-muted-foreground">رصيد الرقم</span>
                                            <span className="font-bold text-primary dark:text-primary-foreground">{phoneInfo.balance}</span>
                                        </div>}
                                         {phoneInfo.solfa && <div className="flex justify-between items-center p-3 text-sm">
                                            <span className="text-muted-foreground">حالة السلفة</span>
                                            <span className={`font-semibold ${phoneInfo.isLoaned ? 'text-destructive' : 'text-green-600'}`}>{phoneInfo.solfa}</span>
                                        </div>}
                                    </div>
                                ) }
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                         <CardContent className="p-0">
                            <div className="bg-muted text-foreground text-center font-bold p-2 text-sm">
                                العروض والباقات المتاحة
                            </div>
                             {isQueryingOffers ? (
                                <div className="p-6 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                </div>
                            ) : queryOffersError ? (
                                <div className="p-4 text-center text-destructive text-sm flex items-center justify-center gap-2">
                                   <AlertCircle className="h-4 w-4" /> {queryOffersError}
                                </div>
                            ) : availableOffers.length === 0 ? (
                                <p className="text-center text-muted-foreground text-sm p-4">لا توجد عروض متاحة حالياً لهذا الرقم.</p>
                            ) : (
                                <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                                    {availableOffers.map((offer) => (
                                        <Card key={offer.offerId} className="bg-muted/50 p-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex-1 text-right">
                                                    <p className="font-bold text-sm">{offer.offerName}</p>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => handleActivateOffer(offer)} 
                                                    disabled={isActivatingOffer === offer.offerId}
                                                    className="shrink-0"
                                                >
                                                     {isActivatingOffer === offer.offerId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4 ml-2" />}
                                                    {isActivatingOffer === offer.offerId ? '...' : 'تفعيل'}
                                                </Button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                         </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default function TelecomPage() {
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [identifiedCompany, setIdentifiedCompany] = React.useState<Company | null>(null);
  const [isUiVisible, setIsUiVisible] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  
  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(
    () => user ? query(
        collection(firestore, `users/${user.uid}/transactions`),
        where('transactionType', 'in', ['سداد يمن موبايل', 'سداد YOU', 'سداد سبأفون', 'سداد يمن فورجي'])
    ) : null,
    [user, firestore]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const frequentNumbers = useMemo(() => {
    if (!transactions) return [];

    const counts: { [key: string]: number } = {};
    transactions.forEach(tx => {
        if(tx.recipientPhoneNumber) {
            counts[tx.recipientPhoneNumber] = (counts[tx.recipientPhoneNumber] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([phone]) => phone)
        .slice(0, 5); // Get top 5
  }, [transactions]);

  const handleSelectFavorite = (phone: string) => {
    setPhoneNumber(phone);
    setIsFavoritesOpen(false);
  };
  
  React.useEffect(() => {
    // Reset when phone number is cleared
    if (phoneNumber.length === 0) {
      setIsUiVisible(false);
      setIdentifiedCompany(null);
    } else {
        const company = getCompanyFromNumber(phoneNumber);
        setIdentifiedCompany(company);
        if(company) {
            setIsUiVisible(true);
        } else {
            setIsUiVisible(false);
        }
    }
  }, [phoneNumber]);

  return (
    <>
    <div
      className="flex flex-col h-full bg-background"
    >
      <SimpleHeader title="رصيد وباقات" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        <BalanceDisplay />

        <Card>
            <CardContent className="p-3 space-y-1">
                <p className="text-right font-semibold text-xs text-muted-foreground px-1">ادخل رقم الهاتف :</p>
                <div className="flex items-center gap-1 rounded-xl bg-muted p-1 border">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Contact className="h-5 w-5 text-primary" />
                    </Button>
                    <div className="relative flex-1">
                        <Input
                            id="phone-number"
                            type="tel"
                            placeholder="7xxxxxxxx"
                            className="h-10 text-lg font-bold tracking-wider rounded-lg border-0 bg-transparent text-right focus-visible:ring-0 focus-visible:ring-offset-0 pr-1"
                            value={phoneNumber}
                            onChange={(e) =>
                                setPhoneNumber(e.target.value.replace(/\D/g, ''))
                            }
                        />
                    </div>
                    <div className="h-6 w-px bg-border"></div>
                     <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Phone className="h-4 w-4 text-primary" />
                    </Button>
                     <Dialog open={isFavoritesOpen} onOpenChange={setIsFavoritesOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Heart className="h-4 w-4 text-primary" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:rounded-xl">
                            <DialogHeader>
                                <DialogTitle>الارقام المفضلة</DialogTitle>
                                <DialogDescription>
                                يتم اضافة الارقام الاكثر تسديد تلقائياً
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                {frequentNumbers.length > 0 ? (
                                    <div className="space-y-2">
                                        {frequentNumbers.map(phone => (
                                            <div key={phone} onClick={() => handleSelectFavorite(phone)} className="p-3 rounded-lg bg-muted hover:bg-primary/10 cursor-pointer flex justify-between items-center">
                                                <span className="font-mono font-semibold">{phone}</span>
                                                
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground">لا توجد أرقام متكررة في سجل عملياتك.</p>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">إغلاق</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
        
        {isUiVisible && identifiedCompany && <ServiceUI phoneNumber={phoneNumber} company={identifiedCompany}/>}
        
      </div>
    </div>
    <Toaster />
    </>
  );
}
