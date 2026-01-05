
'use client';

import React, { useState, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Wifi, Building, RefreshCw, Smile, Clock, Mail, Globe, AlertTriangle, Frown, Loader2, Wallet } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, increment, collection, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';


type ServiceProvider = 'yemen-mobile' | 'you' | 'saba-fon' | 'yemen-4g' | 'adsl' | 'landline' | 'unknown';

type PackageInfo = {
    packageName: string;
    paymentType?: string;
    sliceType?: string;
    price: number;
    validity: string;
    minutes: string;
    messages?: string;
    data: string;
};

type Yemen4GPackageInfo = {
    packageName: string;
    data: string;
    price: number;
    validity: string;
    minutes: string;
};


const yemen4gPackages: Yemen4GPackageInfo[] = [
    { packageName: "باقة 15 جيجا", data: "15 GB", price: 2400, validity: "شهر", minutes: "اتصال مجاني داخل الشبكة" },
    { packageName: "باقة 25 جيجا", data: "25 GB", price: 4000, validity: "شهر", minutes: "اتصال مجاني داخل الشبكة + 50 دقيقة خارجها" },
    { packageName: "باقة 60 جيجا", data: "60 GB", price: 8000, validity: "شهر", minutes: "اتصال مجاني + 50 دقيقة" },
    { packageName: "باقة 130 جيجا", data: "130 GB", price: 16000, validity: "شهر", minutes: "اتصال مجاني 100 دقيقة اتصال" },
    { packageName: "باقة 250 جيجا", data: "250 GB", price: 26000, validity: "شهر", minutes: "اتصال مجاني + 100 خارجها" },
    { packageName: "باقة 500 جيجا", data: "500 GB", price: 46000, validity: "شهر", minutes: "اتصال مجاني + 50 خارجها" },
];

type SubscriptionInfo = {
    name: string;
    activationDate: string;
    expiryDate: string;
    packageDetails: PackageInfo;
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
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
            <CardContent className="p-3 flex items-center justify-between">
                <div>
                    <p className="font-medium text-muted-foreground text-sm">الرصيد الحالي</p>
                    {isLoading ? (
                        <Skeleton className="h-7 w-28 mt-1" />
                    ) : (
                        <p className="text-xl font-bold text-primary mt-1">{(userProfile?.balance ?? 0).toLocaleString('en-US')} <span className="text-sm">ريال</span></p>
                    )}
                </div>
                <Wallet className="h-7 w-7 text-primary" />
            </CardContent>
        </Card>
    );
}

const serviceConfig = {
  'yemen-mobile': {
    name: 'يمن موبايل',
    logo: 'https://i.postimg.cc/k4c1bV9M/images.png',
    prefix: '77',
    length: 9,
    color: 'bg-red-500',
    textColor: 'text-red-500',
    ringColor: 'focus-visible:ring-red-500',
    destructiveColor: 'bg-red-500 hover:bg-red-600',
  },
   'you': {
    name: 'YOU (Yemen 4G)',
    logo: 'https://i.postimg.cc/TPyC1Prn/YOU-2.png',
    prefix: '71',
    length: 9,
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    ringColor: 'focus-visible:ring-yellow-400',
    destructiveColor: 'bg-yellow-500 hover:bg-yellow-600',
  },
  'yemen-4g': {
    name: 'يمن 4G',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '10',
    length: 9,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    ringColor: 'focus-visible:ring-blue-500',
    destructiveColor: 'bg-blue-500 hover:bg-blue-600',
  },
    'adsl': {
    name: 'ADSL',
    logo: 'https://i.postimg.cc/tCFs01p9/ADSL.png',
    prefix: '05',
    length: 8,
    color: 'bg-blue-800',
    textColor: 'text-blue-800',
    ringColor: 'focus-visible:ring-blue-800',
    destructiveColor: 'bg-blue-800 hover:bg-blue-900',
  },
  'landline': {
    name: 'الهاتف الثابت',
    logo: 'https://i.postimg.cc/q73b2z3W/landline.png',
    prefix: '',
    length: 7,
    color: 'bg-yellow-600',
    textColor: 'text-yellow-600',
    ringColor: 'focus-visible:ring-yellow-600',
    destructiveColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  'unknown': {
      name: 'غير معروف',
      logo: '',
      prefix: '',
      length: 9,
      color: 'bg-gray-400',
      textColor: 'text-gray-400',
      ringColor: 'focus-visible:ring-gray-400',
      destructiveColor: 'bg-gray-500 hover:bg-gray-600',
  }
};

const getProviderFromPhone = (phone: string): ServiceProvider => {
    if (phone.startsWith('77')) return 'yemen-mobile';
    if (phone.startsWith('71')) return 'you';
    if (phone.startsWith('10')) return 'yemen-4g';
    if (phone.startsWith('05') && phone.length <= 8) return 'adsl';
    // Add more rules here
    return 'unknown';
};

const predefinedAmounts = [100, 200, 500, 1000, 2000].reverse();

const PackageCard = ({
    packageInfo,
    onPackageSelect,
}: {
    packageInfo: PackageInfo;
    onPackageSelect: (pkg: PackageInfo) => void;
}) => {
    const { packageName, paymentType, sliceType, price, validity, minutes, messages, data } = packageInfo;
    return (
        <div onClick={() => onPackageSelect(packageInfo)} className="h-full">
             <Card className="relative overflow-hidden rounded-xl bg-card shadow-md cursor-pointer hover:shadow-lg hover:border-border transition-shadow h-full">
                <CardContent className="p-3 text-center flex flex-col h-full">
                    <h3 className="text-sm font-bold text-foreground">{packageName}</h3>
                    <div className="mt-1 flex justify-center items-baseline gap-2 text-xs">
                        <span className="font-semibold text-muted-foreground">{paymentType}</span>
                    </div>
                    <p className="my-1.5 text-2xl font-bold text-primary dark:text-primary-foreground">
                        {price}
                    </p>
                    <div className="mt-auto grid grid-cols-4 divide-x-reverse divide-x border-t bg-muted/50 rtl:divide-x-reverse">
                        <div className="flex flex-col items-center justify-center p-1.5 text-center">
                            <Globe className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs font-semibold">{data}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1.5 text-center">
                            <Mail className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs font-semibold">{messages}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1.5 text-center">
                            <Phone className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs font-semibold">{minutes}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-1.5 text-center">
                            <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                            <span className="text-xs font-semibold">{validity}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const Yemen4GPackageCard = ({ packageInfo, onPackageSelect }: { packageInfo: Yemen4GPackageInfo; onPackageSelect: (pkg: Yemen4GPackageInfo) => void; }) => {
    return (
        <Card onClick={() => onPackageSelect(packageInfo)} className="relative overflow-hidden rounded-xl bg-card shadow-md cursor-pointer hover:shadow-lg hover:border-primary transition-all duration-300">
            <CardContent className="p-4 text-center flex flex-col h-full">
                <h3 className="text-lg font-bold text-foreground">{packageInfo.packageName}</h3>
                <div className="my-2">
                    <p className="text-3xl font-bold text-primary dark:text-primary-foreground">
                        {packageInfo.price.toLocaleString('en-US')}
                    </p>
                     <p className="text-xs text-muted-foreground">ريال يمني</p>
                </div>
                <div className="mt-auto space-y-2 text-sm text-muted-foreground border-t pt-3">
                    <p className="flex items-center justify-center gap-2"><Wifi className="w-4 h-4 text-blue-500" /> {packageInfo.data}</p>
                    <p><Phone className="w-4 h-4 inline ml-1 text-green-500" />{packageInfo.minutes}</p>
                </div>
            </CardContent>
        </Card>
    );
};


const SubscriptionCard = ({
    subscriptionInfo,
    onRenewSelect
}: {
    subscriptionInfo: SubscriptionInfo;
    onRenewSelect: (pkg: PackageInfo) => void;
}) => {
    return (
        <Card className="p-3 bg-card/80 cursor-pointer" onClick={() => onRenewSelect(subscriptionInfo.packageDetails)}>
            <div className="flex items-center gap-3">
                <div className="flex-none">
                    <Button 
                        className="bg-gradient-to-br from-primary to-primary/80 text-white hover:opacity-90 w-16 h-16 flex flex-col items-center shadow-md">
                        <RefreshCw className="h-5 w-5" />
                        <span className="text-xs mt-1">تجديد</span>
                    </Button>
                </div>
                <div className="flex-grow text-sm">
                    <p className="font-bold">{subscriptionInfo.name}</p>
                    <div className="text-xs mt-1 text-muted-foreground">
                        <p className="text-green-600">الإشتراك: {subscriptionInfo.activationDate}</p>
                        <p className="text-red-500">الإنتهاء: {subscriptionInfo.expiryDate}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function PaymentCabinPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [provider, setProvider] = useState<ServiceProvider>('unknown');
    const [activeTab, setActiveTab] = useState('رصيد');
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const { toast } = useToast();
    const [isDebtor, setIsDebtor] = useState(true); // Placeholder for debt status
    const [netAmount, setNetAmount] = useState('');
    
    const [selectedPackage, setSelectedPackage] = useState<PackageInfo | Yemen4GPackageInfo | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isConfirmBalanceOpen, setIsConfirmBalanceOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();


    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);
    
    const currentMaxLength = provider !== 'unknown' ? serviceConfig[provider].length : 9;
    
    const finalAmount = selectedAmount !== null ? selectedAmount : (customAmount ? parseFloat(customAmount) : 0);

    useEffect(() => {
        const detectedProvider = getProviderFromPhone(phoneNumber);
        setProvider(detectedProvider);
    }, [phoneNumber]);

    useEffect(() => {
        if (finalAmount > 0) {
            const calculatedNet = finalAmount * (1 - 0.174);
            setNetAmount(calculatedNet.toFixed(2));
        } else {
            setNetAmount('');
        }
    }, [finalAmount]);

    const checkPhoneNumber = () => {
        if (phoneNumber.length === 0) {
            toast({
                variant: 'destructive',
                title: 'رقم الهاتف مطلوب',
                description: 'الرجاء إدخال رقم الهاتف أولاً.',
            });
            return false;
        }
        if (phoneNumber.length !== currentMaxLength) {
            toast({
                variant: 'destructive',
                title: 'رقم غير صحيح',
                description: `الرجاء إدخال رقم هاتف صحيح مكون من ${currentMaxLength} أرقام.`,
            });
            return false;
        }
        return true;
    };

    const handleAmountButtonClick = (amount: number) => {
        if (!checkPhoneNumber()) return;
        setSelectedAmount(amount);
        setCustomAmount(String(amount));
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomAmount(value);
        if (value !== '') {
            setSelectedAmount(null);
        }
    };
    
     const handlePackageSelect = (pkg: PackageInfo | Yemen4GPackageInfo) => {
        if (!checkPhoneNumber()) return;
        setSelectedPackage(pkg);
        setIsConfirmOpen(true);
    };
    
    const handleYemen4GConfirmPurchase = async () => {
        if (!user || !userDocRef || !firestore || !selectedPackage || !userProfile?.displayName || !userProfile?.phoneNumber) return;
        
        const commission = selectedPackage.price * 0.10;
        const totalCost = selectedPackage.price + commission;

        if ((userProfile?.balance ?? 0) < totalCost) {
            toast({ variant: 'destructive', title: 'رصيد غير كاف', description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية.' });
            setIsConfirmOpen(false);
            return;
        }
        
        setIsProcessing(true);

        const requestData = {
            userId: user.uid,
            userName: userProfile.displayName,
            userPhoneNumber: userProfile.phoneNumber,
            targetPhoneNumber: phoneNumber,
            packageTitle: selectedPackage.packageName,
            packagePrice: selectedPackage.price,
            commission: commission,
            totalCost: totalCost,
            status: 'pending',
            requestTimestamp: new Date().toISOString(),
        };

        const batch = writeBatch(firestore);

        // 1. Deduct total cost from user's balance
        batch.update(userDocRef, { balance: increment(-totalCost) });
        
        // 2. Create the yemen4g request document
        const requestsCollection = collection(firestore, 'yemen4gRequests');
        const requestDocRef = doc(requestsCollection);
        batch.set(requestDocRef, requestData);

        try {
            await batch.commit();
            setShowSuccess(true);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إرسال طلب السداد.' });
        } finally {
            setIsProcessing(false);
            setIsConfirmOpen(false);
        }
    };
    

    const handlePayBalance = async () => {
        if (!user || !userDocRef || !firestore || finalAmount <= 0) return;

        if ((userProfile?.balance ?? 0) < finalAmount) {
            toast({ variant: 'destructive', title: 'رصيد غير كاف', description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية.' });
            setIsConfirmBalanceOpen(false);
            return;
        }
        
        setIsProcessing(true);
        const batch = writeBatch(firestore);

        // 1. Deduct from user's balance
        batch.update(userDocRef, { balance: increment(-finalAmount) });

        // 2. Create transaction record
        const transactionRef = doc(collection(firestore, `users/${user.uid}/transactions`));
        batch.set(transactionRef, {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: finalAmount,
            transactionType: 'سداد رصيد يمن موبايل',
            notes: `سداد إلى الرقم: ${phoneNumber}`
        });

        try {
            await batch.commit();
            toast({ title: 'نجاح', description: 'تم سداد الرصيد بنجاح.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل سداد الرصيد.' });
            console.error(error);
        } finally {
            setIsProcessing(false);
            setIsConfirmBalanceOpen(false);
            setCustomAmount('');
            setSelectedAmount(null);
        }
    };
    
    const renderYemenMobilePackages = () => {
        const examplePackage: PackageInfo = {
            packageName: "باقة مزايا فورجي الاسبوعية",
            paymentType: "دفع مسبق",
            sliceType: "شريحة",
            price: 1500,
            validity: "7 أيام",
            minutes: "200",
            messages: "300",
            data: "2 GB",
        };

        const exampleSubscriptions: SubscriptionInfo[] = [
            {
                name: "تفعيل خدمة الانترنت - شريحة (3G)",
                activationDate: "09:54:37 2023-06-20",
                expiryDate: "00:00:00 2037-01-01",
                packageDetails: examplePackage // Using example package for renewal
            },
            {
                name: "مزايا الشهريه - 350 دقيقه 150 رساله 250 ميجا",
                activationDate: "20:42:53 2025-12-08",
                expiryDate: "23:59:59 2026-01-06",
                packageDetails: examplePackage // Using example package for renewal
            }
        ];

        return (
          <div className="space-y-4">
             <Card className="p-2">
                <div className="grid grid-cols-3 divide-x-reverse divide-x text-center rtl:divide-x-reverse">
                    <div className="px-1">
                        <p className="text-xs font-bold text-destructive">رصيد الرقم</p>
                        <p className="font-bold text-sm text-foreground mt-1">77</p>
                    </div>
                    <div className="px-1">
                        <p className="text-xs font-bold text-destructive">نوع الرقم</p>
                        <p className="font-bold text-xs text-foreground mt-1">3G | دفع مسبق</p>
                    </div>
                     <div className="px-1">
                        <p className="text-xs font-bold text-destructive">فحص السلفة</p>
                        {isDebtor ? (
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <Frown className="h-4 w-4 text-foreground" />
                                <p className="font-bold text-xs text-foreground">متسلف</p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <Smile className="h-4 w-4 text-green-600" />
                                <p className="font-bold text-xs text-green-600">غير متسلف</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
    
            <div className="bg-red-100/50 border border-red-200/50 rounded-xl p-3">
              <h3 className="text-center font-bold text-primary dark:text-primary-foreground mb-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-md py-1 shadow">الاشتراكات الحالية</h3>
              <div className="space-y-3">
                 {exampleSubscriptions.map((sub, index) => (
                    <SubscriptionCard key={index} subscriptionInfo={sub} onRenewSelect={handlePackageSelect} />
                 ))}
              </div>
            </div>
    
             <Accordion type="single" collapsible className="w-full space-y-3">
                <AccordionItem value="item-1" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات مزايا</span>
                             <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary text-sm font-bold">3G</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                        <div className="grid grid-cols-1 gap-3">
                            <PackageCard packageInfo={examplePackage} onPackageSelect={handlePackageSelect} />
                            <PackageCard packageInfo={examplePackage} onPackageSelect={handlePackageSelect} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                         <div className="flex items-center justify-between w-full">
                            <span>باقات فورجي</span>
                             <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary text-sm font-bold">4G</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         <div className="grid grid-cols-1 gap-3">
                            <PackageCard packageInfo={examplePackage} onPackageSelect={handlePackageSelect} />
                         </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات فولتي VOLTE</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary text-sm font-bold">4G</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         سيتم عرض باقات فولتي هنا قريباً.
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-4" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات الإنترنت الشهرية</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary text-sm font-bold">↑↓</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         سيتم عرض باقات الإنترنت الشهرية هنا قريباً.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات الإنترنت 10 ايام</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary text-xs font-bold p-0.5">10 MP</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         سيتم عرض باقات الإنترنت 10 ايام هنا قريباً.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>
        );
    }
    
    const renderYemen4GPackages = () => (
        <div className="space-y-4">
             <div className="grid grid-cols-1 gap-4">
                {yemen4gPackages.map((pkg, index) => (
                    <Yemen4GPackageCard key={index} packageInfo={pkg} onPackageSelect={handlePackageSelect} />
                ))}
            </div>
        </div>
    );

     if (showSuccess) {
      return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
          <Card className="w-full max-w-sm text-center shadow-2xl">
              <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center gap-4">
                      <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                          <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 className="text-xl font-bold">تم إرسال طلبك بنجاح</h2>
                      <p className="text-sm text-muted-foreground">ستتم معالجة طلب سداد الباقة في أقرب وقت ممكن.</p>
                      <div className="w-full pt-4">
                          <Button variant="outline" className="w-full" onClick={() => router.push('/')}>العودة للرئيسية</Button>
                      </div>
                  </div>
              </CardContent>
          </Card>
        </div>
      );
    }


    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SimpleHeader title="كبينة السداد" />
            <Toaster />
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <BalanceDisplay />
                 <Card className={cn(
                    "rounded-2xl shadow-lg border-2 transition-colors duration-500",
                    provider === 'yemen-mobile' ? 'border-red-500/20 bg-red-500/5' : 
                    provider === 'you' ? 'border-yellow-400/20 bg-yellow-400/5' : 'border-border bg-card'
                 )}>
                    <CardContent className="p-4 flex items-center gap-3">
                         {provider !== 'unknown' && (
                            <div className="p-1 bg-white rounded-lg shadow animate-in fade-in-0 zoom-in-75">
                                <Image
                                    src={serviceConfig[provider].logo}
                                    alt={serviceConfig[provider].name}
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                />
                            </div>
                        )}
                        <div className="relative flex-grow">
                             <Input
                                id="phone-number"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className={cn(
                                    "bg-transparent border-0 text-lg font-bold p-0 h-auto text-right focus-visible:ring-0 shadow-none focus-visible:ring-offset-0",
                                    provider !== 'unknown' ? serviceConfig[provider].ringColor : ''
                                )}
                                placeholder="أدخل رقم الجوال"
                                maxLength={currentMaxLength}
                            />
                        </div>
                         <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                         </div>
                    </CardContent>
                </Card>

                {provider === 'yemen-mobile' && (
                    <div className="space-y-4 animate-in fade-in-0 duration-500 p-4 rounded-2xl bg-gradient-to-b from-red-500/10 to-red-500/0">
                        <div className="grid grid-cols-2 bg-muted p-1 rounded-xl">
                            {['رصيد', 'باقات'].map((tab) => (
                               <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "text-sm py-1.5 rounded-lg transition-colors font-semibold",
                                    activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                                )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                         {activeTab === 'باقات' && renderYemenMobilePackages()}

                         {activeTab === 'رصيد' && (
                            <div className="space-y-4">
                                <Card className="rounded-2xl shadow-lg border-2 border-primary/20 bg-primary/5 text-center">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-primary/80 dark:text-primary-foreground/80">الرصيد الحالي للاشتراك</p>
                                        <p className="text-3xl font-bold text-primary dark:text-primary-foreground mt-1">0</p>
                                    </CardContent>
                                </Card>
                                
                                <div className="grid grid-cols-5 gap-2">
                                {predefinedAmounts.map(amount => (
                                    <Button 
                                            key={amount} 
                                            variant={selectedAmount === amount ? "default" : "outline"}
                                            onClick={() => handleAmountButtonClick(amount)}
                                            className={cn(
                                                "h-12 text-sm font-bold rounded-xl",
                                                selectedAmount === amount && `bg-primary hover:bg-primary/90 border-primary text-white`
                                            )}
                                    >
                                        {amount}
                                    </Button>
                                ))}
                                </div>

                                <div className='space-y-3'>
                                    <div>
                                        <Label htmlFor="customAmount" className="text-muted-foreground mb-1 block text-right">مبلغ</Label>
                                        <Input 
                                            id="customAmount"
                                            type="number" 
                                            placeholder="أدخل المبلغ"
                                            value={customAmount}
                                            onChange={handleCustomAmountChange}
                                            className="h-14 text-lg text-center"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="netAmount" className="text-muted-foreground mb-1 block text-right">صافي الرصيد بعد خصم الضريبة</Label>
                                        <Input 
                                            id="netAmount"
                                            type="text" 
                                            placeholder="0.00"
                                            value={netAmount}
                                            readOnly
                                            className="h-14 text-lg text-center bg-muted/70 text-primary dark:text-primary-foreground font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>
                )}
                 {provider === 'you' && (
                    <div className="space-y-4 animate-in fade-in-0 duration-500">
                        {renderYemen4GPackages()}
                    </div>
                 )}
            </div>

            {provider === 'yemen-mobile' && activeTab === 'رصيد' && (
                <div className="p-4 bg-background border-t shadow-inner sticky bottom-0">
                    <Button 
                        onClick={() => {
                            if (!checkPhoneNumber()) return;
                             if (finalAmount <= 0) {
                                toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء تحديد مبلغ للسداد.' });
                                return;
                            }
                            setIsConfirmBalanceOpen(true);
                        }}
                        className="w-full h-12 text-lg font-bold"
                        disabled={finalAmount <= 0}
                    >
                        تسديد
                    </Button>
                </div>
            )}
             <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                {selectedPackage && (
                     <AlertDialogContent className="rounded-xl max-w-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className='text-center'>تأكيد تفعيل الباقة</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription asChild>
                            <div className="pt-4 space-y-4 text-sm">
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="text-muted-foreground">الباقة</p>
                                    <p className="font-bold text-lg text-primary dark:text-primary-foreground">{selectedPackage.packageName}</p>
                                </div>
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="text-muted-foreground">رقم الهاتف</p>
                                    <p className="font-semibold font-mono text-lg">{phoneNumber}</p>
                                </div>
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="text-muted-foreground">المبلغ</p>
                                    <p className="font-bold text-2xl text-destructive">{Number(selectedPackage.price).toLocaleString('en-US')} ريال</p>
                                </div>
                                {provider === 'you' && (
                                     <div className="bg-muted p-3 rounded-lg text-center space-y-1">
                                        <p className="flex justify-between"><span>سعر الباقة:</span> <span>{selectedPackage.price.toLocaleString('en-US')} ريال</span></p>
                                        <p className="flex justify-between"><span>العمولة (10%):</span> <span>{(selectedPackage.price * 0.10).toLocaleString('en-US')} ريال</span></p>
                                        <hr/>
                                        <p className="flex justify-between pt-1 font-bold text-destructive text-base"><span>الإجمالي:</span> <span>{(selectedPackage.price * 1.10).toLocaleString('en-US')} ريال</span></p>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                        <AlertDialogFooter className="grid grid-cols-2 gap-3 pt-2">
                            <AlertDialogAction className='flex-1' onClick={provider === 'you' ? handleYemen4GConfirmPurchase : () => {
                                // Add purchase logic here
                                setIsConfirmOpen(false);
                                toast({ title: "جاري تفعيل الباقة...", description: "سيتم إشعارك عند اكتمال العملية." });
                            }} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد'}
                            </AlertDialogAction>
                            <AlertDialogCancel className='flex-1 mt-0' disabled={isProcessing}>إلغاء</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )}
            </AlertDialog>
            <AlertDialog open={isConfirmBalanceOpen} onOpenChange={setIsConfirmBalanceOpen}>
                    <AlertDialogContent className="rounded-xl max-w-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className='text-center'>تأكيد سداد الرصيد</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription asChild>
                            <div className="pt-4 space-y-4 text-sm">
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="text-muted-foreground">سداد إلى الرقم</p>
                                    <p className="font-bold text-lg font-mono text-primary dark:text-primary-foreground">{phoneNumber}</p>
                                </div>
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="text-muted-foreground">المبلغ</p>
                                    <p className="font-bold text-2xl text-destructive">{finalAmount.toLocaleString('en-US')} ريال</p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                        <AlertDialogFooter className="grid grid-cols-2 gap-2 pt-2">
                            <AlertDialogAction className='flex-1' onClick={handlePayBalance} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد'}
                            </AlertDialogAction>
                            <AlertDialogCancel className='flex-1 mt-0' disabled={isProcessing}>إلغاء</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    