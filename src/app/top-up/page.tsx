'use client';

import React, { useState, useMemo, ChangeEvent } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Send, Upload, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { processReceipt, type ProcessReceiptOutput } from '@/ai/flows/process-receipt-flow';

type PaymentMethod = {
  id: string;
  name: string;
  accountHolderName: string;
  accountNumber: string;
  logoUrl?: string;
};

type AppSettings = {
    supportPhoneNumber: string;
};

type UserProfile = {
    displayName?: string;
    phoneNumber?: string;
};

const getLogoSrc = (url?: string) => {
    if (url && (url.startsWith('http') || url.startsWith('/'))) {
      return url;
    }
    return 'https://placehold.co/100x100/e2e8f0/e2e8f0'; 
};

export default function TopUpPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useUser();
    
    const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);
    
    const methodsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'paymentMethods') : null),
        [firestore]
    );
    const { data: paymentMethods, isLoading } = useCollection<PaymentMethod>(methodsCollection);
    
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);


    const settingsDocRef = useMemoFirebase(
      () => (firestore && user ? doc(firestore, 'appSettings', 'global') : null),
      [firestore, user]
    );
    const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

    React.useEffect(() => {
        if (!selectedMethod && paymentMethods && paymentMethods.length > 0) {
            setSelectedMethod(paymentMethods[0]);
        }
    }, [paymentMethods, selectedMethod]);

    const handleCopy = (accountNumber: string) => {
        navigator.clipboard.writeText(accountNumber);
        toast({
            title: "تم النسخ",
            description: "تم نسخ رقم الحساب بنجاح.",
        });
    };
    
    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleConfirmDeposit = async () => {
        if (!receiptImage || !amount) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال المبلغ ورفع صورة الإيصال.' });
            return;
        }
        if (!user || !userProfile || !userProfile.displayName || !userProfile.phoneNumber) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكن إتمام العملية، بيانات المستخدم غير مكتملة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const response: ProcessReceiptOutput = await processReceipt({
                receiptImage,
                amount: parseFloat(amount),
                userId: user.uid,
                userName: userProfile.displayName,
                userPhoneNumber: userProfile.phoneNumber,
            });

            if (response.success) {
                setShowSuccess(true);
            } else {
                 toast({ variant: 'destructive', title: 'فشل الإيداع', description: response.message });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'خطأ فني', description: 'حدث خطأ غير متوقع أثناء معالجة الإيصال.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const renderPaymentMethods = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-2 gap-4 px-4">
                    {[...Array(4)].map((_, i) => (
                         <div key={i} className="flex flex-col items-center justify-center space-y-2 rounded-xl bg-card p-4 aspect-square border">
                            <Skeleton className="h-12 w-12 rounded-lg"/>
                            <Skeleton className="h-4 w-24"/>
                        </div>
                    ))}
                </div>
            );
        }

        if (!paymentMethods || paymentMethods.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center h-40 px-4">
                    <p className="mt-4 text-lg font-semibold">لا توجد طرق دفع متاحة</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        الرجاء إضافة طرق دفع من لوحة التحكم.
                    </p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 gap-4 px-4">
                {paymentMethods.map(method => (
                    <Card
                        key={method.id}
                        onClick={() => setSelectedMethod(method)}
                        className={cn(
                            "flex flex-col items-center justify-center space-y-2 rounded-xl p-4 aspect-square cursor-pointer transition-all border-2",
                            selectedMethod?.id === method.id 
                                ? 'border-primary shadow-lg' 
                                : 'border-border hover:border-primary/50'
                        )}
                    >
                        <Image 
                            src={getLogoSrc(method.logoUrl)} 
                            alt={method.name} 
                            width={48} 
                            height={48} 
                            className="rounded-lg object-contain" 
                        />
                        <p className="text-center text-xs font-semibold">{method.name}</p>
                    </Card>
                ))}
            </div>
        );
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
                        <h2 className="text-2xl font-bold">تم الإيداع بنجاح</h2>
                        <p className="text-sm text-muted-foreground">تمت إضافة المبلغ إلى رصيدك بنجاح.</p>
                        <div className="w-full pt-4">
                            <Button variant="default" className="w-full" onClick={() => window.location.reload()}>العودة للرئيسية</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      );
    }


    return (
        <>
            <div className="flex flex-col h-full bg-background">
                <SimpleHeader title="غذي حسابك" />
                <div className="flex-1 overflow-y-auto space-y-6">
                    <div className="pt-4">
                        <div className="px-4">
                            <h2 className="text-lg font-bold">1. اختر طريقة الدفع</h2>
                            <p className="text-sm text-muted-foreground">اختر الحساب الذي تود التحويل إليه.</p>
                        </div>
                        <div className="mt-4">
                            {renderPaymentMethods()}
                        </div>
                    </div>

                    {selectedMethod && (
                        <div className="animate-in fade-in-0 duration-300 px-4">
                            <h2 className="text-lg font-bold">2. حوّل المبلغ إلى الحساب التالي</h2>
                            <Card className="mt-4">
                                <CardContent className="p-4 text-center space-y-3">
                                     <Image 
                                        src={getLogoSrc(selectedMethod.logoUrl)} 
                                        alt={selectedMethod.name} 
                                        width={56} 
                                        height={56} 
                                        className="rounded-xl object-contain mx-auto" 
                                    />
                                    <div>
                                        <p className="text-sm text-muted-foreground">حول إلى حساب</p>
                                        <p className="text-lg font-bold">{selectedMethod.accountHolderName}</p>
                                    </div>
                                    <div className="flex items-center justify-center bg-muted p-2 rounded-lg gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(selectedMethod.accountNumber)}>
                                            <Copy className="ml-1 h-3 w-3" />
                                            نسخ
                                        </Button>
                                        <p className="text-lg font-mono tracking-wider text-primary dark:text-primary-foreground">{selectedMethod.accountNumber}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    
                    {selectedMethod && (
                       <div className="animate-in fade-in-0 duration-300 delay-150 px-4 pb-4">
                           <h2 className="text-lg font-bold">3. تأكيد الإيداع</h2>
                           <p className="text-sm text-muted-foreground mt-1">أدخل المبلغ وارفع صورة من إيصال التحويل لإتمام العملية تلقائياً.</p>
                           <Card className="mt-4">
                               <CardContent className="p-4 space-y-4">
                                    <div>
                                        <label htmlFor="amount" className="text-sm font-medium">المبلغ المحوّل</label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            placeholder="ادخل المبلغ"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="receipt" className="text-sm font-medium">إيصال التحويل</label>
                                         <Button asChild variant="outline" className="w-full mt-1 border-dashed">
                                            <label htmlFor="receipt-upload" className="cursor-pointer">
                                                <Upload className="ml-2 h-4 w-4" />
                                                <span>{receiptImage ? "تم اختيار صورة" : "اختر صورة الإيصال"}</span>
                                            </label>
                                        </Button>
                                        <Input id="receipt-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                                    </div>
                                    {receiptImage && (
                                        <div className="border rounded-lg p-2">
                                            <Image src={receiptImage} alt="معاينة الإيصال" width={400} height={400} className="rounded-md object-contain max-h-48 w-full" />
                                        </div>
                                    )}

                                   <Button className="w-full" onClick={handleConfirmDeposit} disabled={isProcessing}>
                                        {isProcessing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
                                        {isProcessing ? 'جاري المعالجة...' : 'تأكيد الإيداع'}
                                   </Button>
                               </CardContent>
                           </Card>
                       </div>
                    )}
                </div>
            </div>
            <Toaster />
        </>
    );
}
