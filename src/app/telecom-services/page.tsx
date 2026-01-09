

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, RefreshCw, ChevronLeft, Loader2, Search, CheckCircle, CreditCard, AlertTriangle, Info, Calendar, Database, Smile, ThumbsDown, Phone, Wifi, Send, History, CircleDollarSign, Router, Zap, MessageSquare, Briefcase } from 'lucide-react';
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

type OfferDetails = {
  data?: string;
  minutes?: string;
  sms?: string;
  validity?: string;
  price: number;
}

type OfferWithPrice = Offer & OfferDetails & { id?: string };


type Yemen4GQuery = {
    balance: string;
    exp_date: string;
    resultDesc: string;
};

type YemenPostQuery = {
    balance: string;
    resultDesc: string;
    'Gigabyte(s)': string;
    'Package Price': string;
    'Minimum Amount': string;
    'Package Size': string;
    'Speed': string;
    'Expire Date': string;
};

const GenericOperatorUI = ({ operatorName, onBillPay }: { operatorName: string, onBillPay: (amount: number) => void }) => {
    const [amount, setAmount] = useState('');
    return (
        <Card className="animate-in fade-in-0 duration-500">
            <CardHeader>
                <CardTitle className="text-center">تسديد رصيد {operatorName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="generic-amount">المبلغ</Label>
                    <Input 
                        id="generic-amount"
                        type="number"
                        placeholder="أدخل المبلغ..."
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                </div>
                <Button 
                    className="w-full"
                    onClick={() => onBillPay(Number(amount))}
                    disabled={!amount || Number(amount) <= 0}
                >
                    <CreditCard className="ml-2 h-4 w-4" />
                    دفع
                </Button>
            </CardContent>
        </Card>
    );
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

const manualPackages: OfferWithPrice[] = [
    { name: 'هدايا - الشهرية', offerName: 'هدايا - الشهرية', id: 'A68329', offerId: 'A68329', price: 1500, validity: 'شهر', offerStartDate: '', offerEndDate: '' },
    { name: 'مزايا الاسبوعية', offerName: 'مزايا الاسبوعية', id: 'A64329', offerId: 'A64329', price: 485, data: '90 MB', sms: '30', minutes: '100', validity: '7 أيام', offerStartDate: '', offerEndDate: '' },
    { name: 'مزايا الشهرية', offerName: 'مزايا الشهرية', id: 'A38394', offerId: 'A38394', price: 1300, data: '250 MB', sms: '150', minutes: '350', validity: '30 يوم', offerStartDate: '', offerEndDate: '' },
    { name: 'هدايا - فوترة الاسبوعيه', offerName: 'هدايا - فوترة الاسبوعيه', id: 'A44330', offerId: 'A44330', price: 600, validity: 'أسبوع', offerStartDate: '', offerEndDate: '' },
    { name: 'هدايا توفير 250', offerName: 'هدايا توفير 250', id: 'A66328', offerId: 'A66328', price: 250, offerStartDate: '', offerEndDate: '' },
    { name: 'مزايا ماكس الشهريه', offerName: 'مزايا ماكس الشهريه', id: 'A75328', offerId: 'A75328', price: 2000, data: '600 MB', sms: '200', minutes: '500', validity: '30 يوم', offerStartDate: '', offerEndDate: '' },
    { name: 'الشهريه للفوتره', offerName: 'الشهريه للفوتره', id: 'A76328', offerId: 'A76328', price: 3000, validity: 'شهر', offerStartDate: '', offerEndDate: '' },
    { name: 'باقه 150 ميجابايت فوتره شريحه', offerName: 'باقه 150 ميجابايت فوتره شريحه', id: 'A69351', offerId: 'A69351', price: 500, data: '150 MB', offerStartDate: '', offerEndDate: '' },
    { name: 'باقه 150 ميجابايت فوتره برمجه', offerName: 'باقه 150 ميجابايت فوتره برمجه', id: 'A69361', offerId: 'A69361', price: 500, data: '150 MB', offerStartDate: '', offerEndDate: '' },
    { name: 'باقه 300 ميجابايت فوتره شريحه', offerName: 'باقه 300 ميجابايت فوتره شريحه', id: 'A69352', offerId: 'A69352', price: 900, data: '300 MB', offerStartDate: '', offerEndDate: '' },
    { name: 'باقه 300 ميجابايت فوتره برمجه', offerName: 'باقه 300 ميجابايت فوتره برمجه', id: 'A69362', offerId: 'A69362', price: 900, data: '300 MB', offerStartDate: '', offerEndDate: '' },
    { name: 'باقه 450 ميجابايت فوتره شريحه', offerName: 'باقه 450 ميجابايت فوتره شريحه', id: 'A69354', offerId: 'A69354', price: 1300, data: '450 MB', offerStartDate: '', offerEndDate: '' },
    { name: 'باقة دفع مسبق 150 ميجا', offerName: 'باقة دفع مسبق 150 ميجا', id: 'A69332', offerId: 'A69332', price: 500, data: '150 MB', offerStartDate: '', offerEndDate: '' },
    { name: 'باقة دفع مسبق 150 ميجا', offerName: 'باقة دفع مسبق 150 ميجا', id: 'A69329', offerId: 'A69329', price: 500, data: '150 MB', offerStartDate: '', offerEndDate: '' },
];

const parseOfferDetails = (name: string): Partial<OfferDetails> => {
    const details: Partial<OfferDetails> = {};
  
    // Regex to find patterns like 2GB, 500MB, 100 دق, 200 رس, etc.
    const dataMatch = name.match(/(\d+)\s?(GB|MB|جيجا|ميجابايت|غيغا)/i);
    const minutesMatch = name.match(/(\d+)\s?(دقائق|دق|دقيقة)/i);
    const smsMatch = name.match(/(\d+)\s?(رسائل|رسالة|رس)/i);
    const validityMatch = name.match(/(يوم|أسبوع|شهر|يومين|أيام|اسبوع|شهري|اسبوعي)/i);
    
    if (dataMatch) details.data = `${dataMatch[1]} ${dataMatch[2].toUpperCase().startsWith('G') ? 'GB' : 'MB'}`;
    if (minutesMatch) details.minutes = minutesMatch[1];
    if (smsMatch) details.sms = smsMatch[1];
    if (validityMatch) details.validity = validityMatch[0];
  
    return details;
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
    const isAmountInvalid = Number(billAmount) < 21 && billAmount !== '';
    const TAX_RATE = 0.174;

    const netAmount = useMemo(() => {
        const amount = parseFloat(billAmount);
        if (isNaN(amount) || amount <= 0) return 0;
        return amount - (amount * TAX_RATE);
    }, [billAmount]);

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
    
    const offerCategories: Record<string, string[]> = {
        'باقات مزايا': ['مزايا'],
        'باقات فورجي': ['فورجي', '4G'],
        'باقات VoLTE': ['VoLTE'],
        'باقات هدايا': ['هدايا'],
        'باقات الانترنت الشهرية': ['نت', 'شهري'],
        'باقات انترنت 10 أيام': ['نت', '10 أيّام'],
        'باقات تواصل اجتماعي': ['تواصل'],
    };

    const categorizedOffers = useMemo(() => {
        const initializedCategories: Record<string, OfferWithPrice[]> = Object.fromEntries(
            Object.keys(offerCategories).map(key => [key, []])
        );
        initializedCategories['باقات أخرى'] = [];
        const active: OfferWithPrice[] = [];
    
        const allOffers = [...(offers || []), ...manualPackages];
        const uniqueOffers = Array.from(new Map(allOffers.map(o => [o.offerId || o.id, o])).values());
    
        uniqueOffers.forEach(offer => {
            const offerId = offer.offerId || offer.id;
            if (!offerId) return;

            const correctedName = offer.offerName || offer.name;
            const manualPkg = manualPackages.find(p => p.id === offerId);
            const price = offer.price || manualPkg?.price || parseFloat(correctedName.match(/(\d+(\.\d+)?)/)?.[0] || '0');
            const parsedDetails = manualPkg ? { data: manualPkg.data, sms: manualPkg.sms, minutes: manualPkg.minutes, validity: manualPkg.validity } : parseOfferDetails(correctedName);
            
            const offerWithDetails: OfferWithPrice = { ...offer, ...parsedDetails, offerId, name: correctedName, offerName: correctedName, price };
    
            if (offer.offerId && offer.offerId.startsWith('A') && !manualPackages.some(p => p.id === offer.offerId)) {
                active.push(offerWithDetails);
                return;
            }
    
            let assigned = false;
            for (const category in offerCategories) {
                const keywords = offerCategories[category];
                if (keywords.some(kw => correctedName.toLowerCase().includes(kw.toLowerCase()))) {
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
                finalCategories[category] = initializedCategories[category].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
            }
        }
    
        return { available: finalCategories, active };
    }, [offers]);

    const isLoanActive = solfaData?.status === "1";
    
    const renderOfferIcon = (category: string) => {
        if (category.includes('فورجي') || category.includes('VoLTE')) return <Briefcase className="w-5 h-5"/>;
        if (category.includes('مزايا')) return <Smile className="w-5 h-5"/>;
        if (category.includes('هدايا')) return <History className="w-5 h-5"/>;
        if (category.includes('انترنت')) return <Database className="w-5 h-5"/>;
        if (category.includes('تواصل')) return <Send className="w-5 h-5"/>;
        return <CreditCard className="w-5 h-5"/>;
    }

    const getMobileTypeString = (type: string | undefined) => {
        if (type === '0') return 'دفع مسبق';
        if (type === '1') return 'فوترة';
        return 'غير معروف';
    }
    
    const OfferDetailIcon = ({ icon: Icon, value, label }: { icon: React.ElementType, value?: string, label: string }) => {
        if (!value) return null;
        return (
            <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{value}</span>
                <span className="text-[10px] hidden">{label}</span>
            </div>
        );
    }

    return (
    <div className="space-y-4 animate-in fade-in-0 duration-500" data-theme="yemen-mobile">
        <Tabs defaultValue="packages" className="w-full" onValueChange={(value) => {
            if (value === 'packages') {
                refreshBalanceAndSolfa();
            }
        }}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="packages">الباقات</TabsTrigger>
                <TabsTrigger value="balance">الرصيد</TabsTrigger>
            </TabsList>
            <TabsContent value="packages" className="pt-4 space-y-4">
                 <Card>
                    <CardHeader className="p-3">
                        <CardTitle className="text-sm text-center">بيانات الرقم</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                        {isLoadingBalance ? (
                            <Skeleton className="h-10 w-full" />
                        ) : balanceData ? (
                            <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                <div className="p-2 bg-muted rounded-lg">
                                    <p className="font-semibold text-muted-foreground">الرصيد</p>
                                    <p className="font-bold text-primary">{balanceData.balance} ريال</p>
                                </div>
                                <div className="p-2 bg-muted rounded-lg">
                                    <p className="font-semibold text-muted-foreground">نوع الخط</p>
                                    <p className="font-bold text-primary">{getMobileTypeString(balanceData.mobileType)}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-xs text-muted-foreground py-2">تعذر جلب بيانات الرصيد.</p>
                        )}
                        {isLoadingSolfa ? (
                            <Skeleton className="h-8 w-full" />
                        ) : solfaData && (
                            <div className={cn("p-2 rounded-lg text-center text-xs font-semibold flex items-center justify-center gap-2", isLoanActive ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                                {isLoanActive ? <ThumbsDown className="h-4 w-4" /> : <Smile className="h-4 w-4" />}
                                <span>{solfaData.message}</span>
                                {isLoanActive && <span>({solfaData.loan_amount} ريال)</span>}
                            </div>
                        )}
                         {activeSubscriptions.length > 0 && (
                            <div className="pt-2">
                                <h3 className="font-bold text-center mb-2 text-sm">الاشتراكات الحالية</h3>
                                 <Card>
                                    <CardContent className="p-3 space-y-2">
                                        {activeSubscriptions.map(sub => (
                                            <div key={sub.offerId} className="p-3 rounded-lg border bg-accent/50">
                                                <div className="flex justify-between items-start">
                                                    <div className='flex-1'>
                                                        <p className="font-bold text-sm">{sub.offerName}</p>
                                                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                                            <p>الاشتراك: <span className="font-mono">{formatApiDate(sub.offerStartDate)}</span></p>
                                                            <p>الانتهاء: <span className="font-mono">{formatApiDate(sub.offerEndDate)}</span></p>
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
                            </div>
                        )}
                    </CardContent>
                </Card>
               
                <Accordion type="single" collapsible className="w-full space-y-3" defaultValue={Object.keys(categorizedOffers.available)[0]}>
                    {Object.entries(categorizedOffers.available).map(([category, pkgs]) => (
                        <AccordionItem value={category} key={category} className="border-none">
                            <AccordionTrigger className="p-3 bg-primary text-primary-foreground rounded-lg hover:no-underline hover:bg-primary/90">
                                <div className='flex items-center gap-2'>
                                    <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center">
                                        {renderOfferIcon(category)}
                                    </div>
                                    <span>{category}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                                <div className="space-y-2">
                                {pkgs.map(pkg => (
                                    <Card key={pkg.offerId || pkg.id} onClick={() => onPackageSelect(pkg)} className="cursor-pointer hover:bg-muted/50 p-4">
                                        <div className="flex flex-col items-center text-center">
                                            <h4 className="font-bold text-base">{pkg.offerName}</h4>
                                            <p className="text-xs text-muted-foreground">{getMobileTypeString(balanceData?.mobileType)}</p>
                                            <p className="text-2xl font-bold text-primary my-2">{pkg.price.toLocaleString('en-US')} ريال</p>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                                            <OfferDetailIcon icon={Database} value={pkg.data} label="Data" />
                                            <OfferDetailIcon icon={MessageSquare} value={pkg.sms} label="SMS" />
                                            <OfferDetailIcon icon={Phone} value={pkg.minutes} label="Minutes" />
                                            <OfferDetailIcon icon={Calendar} value={pkg.validity} label="Validity" />
                                        </div>
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
                    <CardHeader className="p-3 text-center">
                        <CardTitle className="text-base text-center">أدخل المبلغ</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-3">
                        <div className="space-y-2">
                            <Input 
                                id="bill-amount"
                                type="number"
                                placeholder="أدخل المبلغ..."
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                            />
                             {isAmountInvalid && (
                                <p className="text-destructive text-xs mt-2">
                                    أقل مبلغ للسداد هو 21 ريال.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2 text-center">
                            <Label htmlFor="net-amount">صافي الرصيد بعد خصم الضريبة</Label>
                            <div id="net-amount" className="p-2 h-10 flex items-center justify-center rounded-xl bg-muted font-bold text-primary">
                                {netAmount.toFixed(2)} ريال
                            </div>
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={() => onBillPay(Number(billAmount))} 
                            disabled={!billAmount || Number(billAmount) <= 0 || isAmountInvalid}
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

const yemen4gPackages = [
    { name: "باقة 15 جيجا", price: 2400 },
    { name: "باقة 25 جيجا", price: 4000 },
    { name: "باقة 60 جيجا", price: 8000 },
    { name: "باقة 130 جيجا", price: 16000 },
    { name: "باقة 250 جيجا", price: 26000 },
    { name: "باقة 500 جيجا", price: 46000 },
];

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
    
    return (
        <div className="space-y-4 animate-in fade-in-0 duration-500">
            <Card>
                <CardHeader className="p-3 text-center">
                    <CardTitle className="text-base">بيانات الرقم (يمن فورجي)</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                     <div className="flex gap-2">
                        <Button onClick={refreshQuery} disabled={isLoadingQuery} className="flex-1" variant="outline">
                            {isLoadingQuery ? <Loader2 className="h-4 w-4 animate-spin"/> : 'استعلام'}
                        </Button>
                        <Button onClick={() => onBillPay(Number(billAmount), 'balance')} disabled={!billAmount || Number(billAmount) <= 0} className="flex-1">
                            تسديد
                        </Button>
                    </div>
                     <div className="relative">
                        <CircleDollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            id="y4g-bill-amount"
                            type="number"
                            placeholder="أو أدخل مبلغ مخصص..."
                            value={billAmount}
                            onChange={(e) => setBillAmount(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                     {queryData && (
                        <Card className="bg-muted/50">
                            <CardContent className="p-3 text-xs">
                                <p>الرصيد: <strong>{queryData.balance}</strong></p>
                                {queryData.exp_date && <p>تاريخ الانتهاء: <strong>{format(parseISO(queryData.exp_date), 'd/M/yyyy', {locale: ar})}</strong></p>}
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="p-3 text-center">
                     <CardTitle className="text-base">شراء باقة</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="grid grid-cols-2 gap-3">
                        {yemen4gPackages.map(pkg => (
                            <Card key={pkg.name} onClick={() => onBillPay(pkg.price, 'package')} className="cursor-pointer hover:bg-primary/10 transition-colors">
                                <CardContent className="p-3 text-center text-primary-foreground bg-primary rounded-lg">
                                    <p className="text-xs">فئة</p>
                                    <p className="font-bold text-sm truncate">{pkg.name}</p>
                                    <div className="mt-2 pt-2 border-t border-primary-foreground/30">
                                        <p className="text-xs">السعر</p>
                                        <p className="font-bold">{pkg.price.toLocaleString('en-US')} ريال</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

const yemenPostPackages = [
    { name: 'سوبر شامل 28G 2M', price: 2900 },
    { name: '24G 2M', price: 2520 },
    { name: '10G 1M', price: 1575 },
    { name: 'سوبر شامل 54G 2M', price: 5100 },
    { name: '50G 2M', price: 4725 },
    { name: '24G 1M', price: 3150 },
    { name: '100G 1M', price: 10500 },
    { name: 'سوبر شامل 70G 4M', price: 7300 },
    { name: '66G 4M', price: 6930 },
  ];

const YemenPostUI = ({
  onBillPay,
  onQuery,
  queryData,
  isLoadingQuery,
}: {
  onBillPay: (amount: number, type: 'adsl' | 'line') => void;
  onQuery: (type: 'adsl' | 'line') => void;
  queryData: YemenPostQuery | null;
  isLoadingQuery: boolean;
}) => {
  const [billAmount, setBillAmount] = useState('');

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
        <Tabs defaultValue="adsl" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="adsl">الإنترنت الأرضي</TabsTrigger>
                <TabsTrigger value="line">الهاتف الثابت</TabsTrigger>
            </TabsList>
            <TabsContent value="adsl" className="pt-4 space-y-4">
                <Card>
                    <CardHeader className="p-3 text-center">
                        <CardTitle className="text-base">تسديد فاتورة ADSL</CardTitle>
                    </CardHeader>
                     <CardContent className="p-3 pt-0 space-y-3">
                        <div className="flex gap-2">
                            <Button onClick={() => onQuery('adsl')} disabled={isLoadingQuery} className="flex-1" variant="outline">
                                {isLoadingQuery ? <Loader2 className="h-4 w-4 animate-spin"/> : 'استعلام'}
                            </Button>
                            <Button onClick={() => onBillPay(Number(billAmount), 'adsl')} disabled={!billAmount || Number(billAmount) <= 0} className="flex-1">
                                تسديد
                            </Button>
                        </div>
                        <div className="relative">
                            <CircleDollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                id="post-adsl-amount"
                                type="number"
                                placeholder="أو أدخل مبلغ مخصص..."
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                                className="pr-10"
                            />
                        </div>
                        {queryData && (
                            <Card className="bg-muted/50">
                                <CardContent className="p-3 text-xs">
                                    <p>الرصيد (جيجا): {queryData['Gigabyte(s)']}</p>
                                    <p>تاريخ الانتهاء: {queryData['Expire Date']}</p>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-3 text-center">
                        <CardTitle className="text-base">شراء باقة إنترنت</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                         <div className="grid grid-cols-2 gap-3">
                            {yemenPostPackages.map(pkg => (
                                <Card key={pkg.name} onClick={() => onBillPay(pkg.price, 'adsl')} className="cursor-pointer hover:bg-primary/10 transition-colors">
                                    <CardContent className="p-3 text-center text-primary-foreground bg-primary rounded-lg">
                                        <p className="text-xs">فئة</p>
                                        <p className="font-bold text-sm truncate">{pkg.name}</p>
                                        <div className="mt-2 pt-2 border-t border-primary-foreground/30">
                                            <p className="text-xs">السعر</p>
                                            <p className="font-bold">{pkg.price.toLocaleString('en-US')} ريال</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="line" className="pt-4 space-y-4">
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-base text-center">سداد فاتورة الهاتف الثابت</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                        {queryData && (
                           <p className="text-center text-sm font-semibold p-2 bg-muted rounded-lg">
                             الرصيد الحالي للفاتورة: <strong className="text-primary">{queryData.balance} ريال</strong>
                           </p>
                        )}
                        <div>
                            <Label htmlFor="post-line-amount">أدخل المبلغ</Label>
                            <Input 
                                id="post-line-amount"
                                type="number"
                                placeholder="0.00"
                                value={billAmount}
                                onChange={(e) => setBillAmount(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <Button onClick={() => onQuery('line')} disabled={isLoadingQuery} variant="outline">
                                {isLoadingQuery ? <Loader2 className="h-4 w-4 animate-spin"/> : 'استعلام'}
                            </Button>
                            <Button onClick={() => onBillPay(Number(billAmount), 'line')} disabled={!billAmount || Number(billAmount) <= 0}>
                                تسديد
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
};


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

  const [yemenPostQueryData, setYemenPostQueryData] = useState<YemenPostQuery | null>(null);
  const [isLoadingYemenPostQuery, setIsLoadingYemenPostQuery] = useState(false);
  const [activeYemenPostQuery, setActiveYemenPostQuery] = useState<'adsl' | 'line' | null>(null);
  
  const [selectedPackage, setSelectedPackage] = useState<OfferWithPrice | null>(null);
  const [billAmount, setBillAmount] = useState<number | null>(null);
  const [yemen4GType, setYemen4GType] = useState<'balance' | 'package' | null>(null);
  const [yemenPostType, setYemenPostType] = useState<'adsl' | 'line' | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const COMMISSION_RATE = 0.05; // 5%

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
    if (phone.startsWith('0') && phone.length === 8) return 'Yemen Post';
    if (phone.length === 9 && phone.match(/^(1|2|3|4|5|6|7)/)) return 'Yemen 4G';
    return null;
  };
  
  const getOperatorLogo = (operator: string | null) => {
      switch(operator) {
          case 'Yemen Mobile': return 'https://i.postimg.cc/52nxCtk5/images.png';
          case 'SabaFon': return 'https://i.postimg.cc/T1j31fnC/sabafon.png';
          case 'YOU': return 'https://i.postimg.cc/SN7B5Y3z/you.png';
          case 'Way': return 'https://i.postimg.cc/j5P7qJ62/logo-W-svg.png';
          case 'Yemen 4G': return 'https://i.postimg.cc/pT2x5nFB/yemen4g.png';
          case 'Yemen Post': return 'https://i.postimg.cc/pLgD1tXz/yplogo.png';
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
          setBalanceData(null);
      } finally {
          setIsLoadingBalance(false);
      }
  }, []);
  
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
        if (data && Array.isArray(data.offers)) {
            setOffers(data.offers);
        } else {
            setOffers([]);
        }
    } catch (error: any) {
        console.error("Offers fetch error:", error);
        setOffers([]);
    } finally {
        setIsLoadingOffers(false);
    }
  }, []);
  
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
        setSolfaData(null);
    } finally {
        setIsLoadingSolfa(false);
    }
  }, []);

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

  const handleYemenPostQuery = useCallback(async (type: 'adsl' | 'line') => {
    if (getOperator(phoneNumber) !== 'Yemen Post') return;
    setIsLoadingYemenPostQuery(true);
    setYemenPostQueryData(null);
    setActiveYemenPostQuery(type);
    try {
        const response = await fetch(`/api/echehanly?service=post&action=query&mobile=${phoneNumber}&type=${type}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'فشل الاستعلام عن فاتورة.');
        }
        setYemenPostQueryData(data);
        if (type === 'line') {
          toast({ title: 'نجاح الاستعلام', description: `الرصيد الحالي للفاتورة: ${data.balance} ريال` });
        }
    } catch (error: any) {
        console.error("Yemen Post query error:", error);
        toast({ variant: 'destructive', title: 'خطأ', description: error.message });
        setYemenPostQueryData(null);
    } finally {
        setIsLoadingYemenPostQuery(false);
    }
  }, [phoneNumber, toast]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        const operator = getOperator(value);
        let maxLength = 9;
        if (operator === 'Yemen Post') {
            maxLength = 8;
        }
        setPhoneNumber(value.slice(0, maxLength));
    };


  useEffect(() => {
    const operator = getOperator(phoneNumber);
    setDetectedOperator(operator);
    
    if (operator !== detectedOperator) {
        setBalanceData(null);
        setOffers(null);
        setSolfaData(null);
        setYemen4gQueryData(null);
        setYemenPostQueryData(null);
        setActiveYemenPostQuery(null);
    }
    
    let requiredLength = 9;
    if (operator === 'Yemen Post') {
      requiredLength = 8;
    }

    if (phoneNumber.length !== requiredLength) {
        if (operator && phoneNumber.length < 6) setDetectedOperator(null);
        return;
    }


    if (operator === 'Yemen Mobile') {
        fetchBalance(phoneNumber);
        fetchOffers(phoneNumber);
        fetchSolfa(phoneNumber);
    } else if (operator === 'Yemen 4G') {
        fetchYemen4GQuery(phoneNumber);
    }
  }, [phoneNumber, detectedOperator, fetchBalance, fetchOffers, fetchSolfa, fetchYemen4GQuery]);
  
    const handlePurchase = async () => {
        const isPackage = !!selectedPackage;
        let amountToPay: number | undefined | null = isPackage ? selectedPackage?.price : billAmount;
    
        if (!amountToPay || amountToPay <= 0) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'المبلغ غير صالح.' });
            setIsConfirming(false);
            return;
        }
    
        const commission = (detectedOperator === 'Yemen 4G' || detectedOperator === 'Yemen Post') ? Math.ceil(amountToPay * COMMISSION_RATE) : 0;
        const totalCost = amountToPay + commission;
    
        if (!userProfile || !firestore || !userDocRef || !user || !userProfile.displayName || !userProfile.phoneNumber) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'معلومات غير كافية لإتمام العملية.' });
            setIsConfirming(false);
            return;
        }
    
        if ((userProfile.balance ?? 0) < totalCost) {
            toast({ variant: "destructive", title: "رصيد غير كاف", description: `رصيدك الحالي لا يكفي ل${isPackage ? 'شراء هذه الباقة' : 'تسديد هذا المبلغ'} (التكلفة الإجمالية ${totalCost} ريال).` });
            setIsConfirming(false);
            return;
        }
    
        setIsProcessing(true);
        let transid = Date.now().toString();
        try {
            let serviceNameForDb: string = detectedOperator || 'خدمة';
            let serviceType: string;
            
            let apiUrl = `/api/echehanly?mobile=${phoneNumber}&transid=${transid}`;
            const serviceMap: { [key: string]: string } = {
                'Yemen Mobile': 'yem', 'SabaFon': 'sab', 'YOU': 'mtn', 'Way': 'way', 'Yemen 4G': 'yem4g', 'Yemen Post': 'post',
            };
            const service = serviceMap[detectedOperator || ''];
            if (!service) throw new Error('مشغل خدمة غير مدعوم.');
            
            apiUrl += `&service=${service}&action=bill&amount=${amountToPay}`;

            if (detectedOperator === 'Yemen Mobile' && isPackage) {
                const offerId = selectedPackage?.offerId || selectedPackage?.id;
                if (!offerId) {
                    throw new Error('معرف الباقة غير صالح.');
                }
                apiUrl += `&offerid=${offerId}`;
                serviceType = `شراء باقة: ${selectedPackage!.offerName}`;
            } else {
                if (detectedOperator === 'Yemen 4G') {
                    serviceType = yemen4GType === 'package' ? 'شراء باقة 4G' : 'تسديد رصيد 4G';
                    apiUrl += `&type=${yemen4GType === 'package' ? '1' : '2'}`;
                } else if (detectedOperator === 'Yemen Post') {
                    serviceType = yemenPostType === 'adsl' ? 'تسديد فاتورة ADSL' : 'تسديد فاتورة هاتف';
                    apiUrl += `&type=${yemenPostType}`;
                } else {
                    serviceType = `سداد ${serviceNameForDb}`;
                }
            }
    
            const response = await fetch(apiUrl);
            const data = await response.json();
            if (!response.ok || (data.resultCode && data.resultCode !== '0')) {
                throw new Error(data.message || data.resultDesc || 'فشلت عملية الدفع لدى مزود الخدمة.');
            }
    
            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalCost) });
    
            const requestData: any = {
                userId: user.uid,
                userName: userProfile.displayName,
                userPhoneNumber: userProfile.phoneNumber,
                company: serviceNameForDb,
                serviceType: serviceType,
                targetPhoneNumber: phoneNumber,
                amount: amountToPay,
                commission: commission,
                totalCost: totalCost,
                status: 'approved',
                requestTimestamp: new Date().toISOString(),
                transid: transid,
            };

            const transactionData: any = {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: totalCost,
                transactionType: serviceType,
                recipientPhoneNumber: phoneNumber,
                notes: `إلى رقم: ${phoneNumber}`
            };
    
            if (isPackage) {
                requestData.notes = `باقة: ${selectedPackage!.offerName}`;
                transactionData.notes = `باقة: ${selectedPackage!.offerName}, إلى رقم: ${phoneNumber}`;
            }
    
            const requestsCollection = collection(firestore, 'billPaymentRequests');
            batch.set(doc(requestsCollection), requestData);

            const transactionsCollection = collection(firestore, 'users', user.uid, 'transactions');
            batch.set(doc(transactionsCollection), transactionData);
    
            await batch.commit();
    
            setSuccessMessage(isPackage ? `تم تفعيل باقة "${selectedPackage?.offerName}" بنجاح.` : `تم تسديد مبلغ ${totalCost.toLocaleString('en-US')} ريال بنجاح.`);
            setShowSuccess(true);
    
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل الدفع', description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirming(false);
        }
    }


  const getConfirmationDetails = () => {
    let baseAmount = billAmount ?? selectedPackage?.price ?? 0;
    if (!baseAmount) return { baseAmount: 0, commission: 0, totalCost: 0, message: '' };

    const isYemen4G = detectedOperator === 'Yemen 4G';
    const isYemenPost = detectedOperator === 'Yemen Post';
    const commission = (isYemen4G || isYemenPost) ? Math.ceil(baseAmount * COMMISSION_RATE) : 0;
    const totalCost = baseAmount + commission;
    let message = '';

    if (isYemen4G) {
        const actionText = yemen4GType === 'package' ? 'شراء باقة' : 'تسديد رصيد';
        message = `هل تريد بالتأكيد ${actionText} للرقم ${phoneNumber}؟`;
    } else if (isYemenPost) {
        const actionText = yemenPostType === 'adsl' ? 'فاتورة ADSL' : 'فاتورة هاتف';
        message = `هل تريد بالتأكيد دفع ${actionText} للرقم ${phoneNumber}؟`;
    } else if (selectedPackage) {
        message = `هل تريد بالتأكيد شراء باقة "${selectedPackage.offerName}"؟`;
    } else {
        message = `هل تريد بالتأكيد تسديد مبلغ للرقم ${phoneNumber}؟`;
    }

    return { baseAmount, commission, totalCost, message };
  }

  const renderOperatorUI = () => {
    if (!detectedOperator) {
        return null;
    }
    
    switch (detectedOperator) {
        case 'Yemen Mobile':
            return <YemenMobileUI 
                balanceData={balanceData} 
                isLoadingBalance={isLoadingBalance}
                solfaData={solfaData}
                isLoadingSolfa={isLoadingSolfa}
                offers={offers as OfferWithPrice[] | null} 
                isLoadingOffers={isLoadingOffers}
                onPackageSelect={(pkg) => {
                    setSelectedPackage(pkg);
                    setBillAmount(pkg.price || null);
                    setIsConfirming(true);
                }}
                onBillPay={(amount) => {
                    setBillAmount(amount);
                    setSelectedPackage(null);
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
                    setBillAmount(amount);
                    setYemen4GType(type);
                    setSelectedPackage(null);
                    setIsConfirming(true);
                }}
                queryData={yemen4gQueryData}
                isLoadingQuery={isLoadingYemen4gQuery}
                refreshQuery={() => fetchYemen4GQuery(phoneNumber)}
            />;
        case 'Yemen Post':
            return <YemenPostUI 
                onBillPay={(amount, type) => {
                    setBillAmount(amount);
                    setYemenPostType(type);
                    setSelectedPackage(null);
                    setIsConfirming(true);
                }}
                onQuery={handleYemenPostQuery}
                queryData={yemenPostQueryData}
                isLoadingQuery={isLoadingYemenPostQuery}
            />;
        default:
            return <GenericOperatorUI 
                operatorName={detectedOperator}
                onBillPay={(amount) => {
                    setBillAmount(amount);
                    setSelectedPackage(null);
                    setIsConfirming(true);
                }}
            />
    }
  }
  
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
        <Card className="w-full max-w-sm text-center shadow-2xl">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold">تمت العملية بنجاح</h2>
                     <p className="text-sm text-muted-foreground">{successMessage}</p>
                    <div className="w-full grid grid-cols-1 gap-3 pt-4">
                        <Button variant="outline" onClick={() => {
                            setShowSuccess(false);
                            setSelectedPackage(null);
                            setBillAmount(null);
                            setYemen4GType(null);
                            setYemenPostType(null);
                        }}>إجراء عملية أخرى</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    )
  }

  const { baseAmount, commission, totalCost, message } = getConfirmationDetails();

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
                    {(isLoadingBalance || isLoadingOffers || isLoadingSolfa || isLoadingYemen4gQuery || isLoadingYemenPostQuery) ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : detectedOperator && getOperatorLogo(detectedOperator) ? (
                        <Image src={getOperatorLogo(detectedOperator)!} alt={detectedOperator} width={32} height={32} className="object-contain"/>
                    ) : (
                        <Phone className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="ادخل رقم الهاتف..."
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="text-lg text-center h-12 tracking-wider"
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
                       {message} سيتم خصم المبلغ الإجمالي من رصيدك.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="space-y-2 py-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ الأساسي:</span>
                        <span>{baseAmount.toLocaleString('en-US')} ريال</span>
                    </div>
                    {commission > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">عمولة (5%):</span>
                            <span>{commission.toLocaleString('en-US')} ريال</span>
                        </div>
                    )}
                    <Separator/>
                    <div className="flex justify-between font-bold text-base">
                        <span className="text-primary">التكلفة الإجمالية:</span>
                        <span className="text-primary">{totalCost.toLocaleString('en-US')} ريال</span>
                    </div>
                </div>
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




    
