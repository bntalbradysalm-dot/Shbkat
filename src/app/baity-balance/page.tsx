
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, User, CheckCircle, Smartphone, Loader2, Package, Building2, Phone, Contact } from 'lucide-react';
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

type UserProfile = {
  id: string;
  balance?: number;
  phoneNumber?: string;
  displayName?: string;
};

const baityPackages = [
    { id: 'A64329', name: 'باقة مزايا الاسبوعية', price: 485 },
    { id: 'A38394', name: 'باقة مزايا الشهرية', price: 1300 },
    { id: 'A75328', name: 'مزايا ماكس الشهرية', price: 2000 },
    { id: 'A76328', name: 'الشهرية للفوترة', price: 3000 },
];

const presetAmounts = [100, 200, 500, 1000, 2000];

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
  const [activeTab, setActiveTab] = useState('payment');

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
                      className="bg-transparent border-none text-lg h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>
                 <div className="p-2 bg-white rounded-lg">
                    <Image src="https://i.postimg.cc/SN7B5Y3z/you.png" alt="Baity" width={28} height={28} className="object-contain" />
                </div>
            </div>
        </Card>

        {mobileNumber.length > 0 && (
            <div className="animate-in fade-in-0 duration-300 space-y-4">
                <div className="flex gap-2 p-1 bg-destructive/10 rounded-full">
                    <TabButton value="payment" label="سداد" />
                    <TabButton value="packages" label="باقات" />
                    <TabButton value="prepaid" label="دفع مسبق" />
                    <TabButton value="postpaid" label="فوترة" />
                </div>
                
                {activeTab === 'payment' && (
                    <>
                         <Card className="rounded-2xl bg-destructive/10 p-4 text-center">
                            <p className="text-sm text-destructive">الرصيد الحالي للإشتراك</p>
                            <p className="text-2xl font-bold text-destructive mt-1">
                                {(userProfile?.balance ?? 0).toLocaleString('en-US')}
                            </p>
                        </Card>

                        <div className="flex justify-around items-center">
                            {presetAmounts.map(pAmount => (
                                <Button key={pAmount} variant="outline" onClick={() => handleAmountButtonClick(pAmount)} className="rounded-full border-destructive text-destructive">
                                    {pAmount}
                                </Button>
                            ))}
                        </div>

                        <div className="relative">
                            <Label htmlFor="amount" className="absolute -top-2 right-4 text-xs bg-background px-1 text-muted-foreground">مبلغ</Label>
                            <Input
                                id="amount"
                                type="number"
                                inputMode='numeric'
                                placeholder="أدخل المبلغ"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="h-14 text-center text-lg rounded-xl border-destructive focus-visible:ring-destructive"
                            />
                        </div>
                    </>
                )}

                {activeTab === 'packages' && (
                    <Accordion type="single" collapsible className="w-full space-y-3">
                         {[{title: 'باقات مزايا', packages: baityPackages}].map((category) => (
                             <AccordionItem value={category.title} key={category.title} className="border-none">
                                <AccordionTrigger className="p-3 bg-destructive text-destructive-foreground rounded-lg hover:no-underline hover:bg-destructive/90">
                                    <span>{category.title}</span>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                     <div className="space-y-2">
                                        {category.packages.map(pkg => (
                                            <Card key={pkg.id} onClick={() => handleConfirmClick('package', pkg)} className="cursor-pointer p-3 hover:bg-muted/50">
                                                 <div className="flex justify-between items-center">
                                                    <span className="font-semibold">{pkg.name}</span>
                                                    <span className="font-bold text-destructive">{pkg.price.toLocaleString('en-US')} ريال</span>
                                                 </div>
                                            </Card>
                                        ))}
                                     </div>
                                </AccordionContent>
                             </AccordionItem>
                         ))}
                    </Accordion>
                )}

            </div>
        )}

      </div>
       {mobileNumber.length > 0 && activeTab === 'payment' && (
          <div className="p-4 border-t animate-in fade-in-0 duration-300">
              <Button onClick={() => handleConfirmClick('balance')} className="w-full h-12 text-base rounded-full bg-destructive text-destructive-foreground" disabled={!mobileNumber || !amount || isProcessing}>
                  {isProcessing && confirmationDetails.type === 'balance' ? <Loader2 className="ml-2 h-5 w-5 animate-spin"/> : null}
                  {isProcessing && confirmationDetails.type === 'balance' ? 'جاري التسديد...' : 'سداد'}
              </Button>
           </div>
        )}
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
