
'use client';

import React, { useState, useMemo, ChangeEvent, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, writeBatch, increment, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Send, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { processReceipt, ReceiptOutput } from '@/ai/flows/process-receipt-flow';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type PaymentMethod = {
  id: string;
  name: string;
  accountHolderName: string;
  accountNumber: string;
  logoUrl?: string;
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
    const router = useRouter();
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
    const { data: paymentMethods, isLoading: isLoadingMethods } = useCollection<PaymentMethod>(methodsCollection);

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [processedAmount, setProcessedAmount] = useState(0);

    
    useEffect(() => {
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
    
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
          setReceiptFile(e.target.files[0]);
        }
    };
    
    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
    };

    const handleProcessReceipt = async () => {
        if (!receiptFile || !selectedMethod || !user || !userProfile?.displayName || !userProfile?.phoneNumber || !firestore || !userDocRef) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء اختيار إيصال وطريقة دفع أولاً.' });
            return;
        }

        setIsProcessing(true);
        let result: ReceiptOutput | null = null;

        try {
            const dataUri = await fileToDataUri(receiptFile);
            result = await processReceipt({
                receiptImage: dataUri,
                userId: user.uid,
            });

            if (!result || !result.isReceipt) {
                throw new Error("الصورة التي تم رفعها لا تبدو كإيصال صحيح.");
            }

            if (result.recipientName.toLowerCase() !== selectedMethod.accountHolderName.toLowerCase()) {
                throw new Error(`اسم المستلم في الإيصال (${result.recipientName}) لا يطابق الاسم المتوقع (${selectedMethod.accountHolderName}).`);
            }

            if (result.accountNumber.replace(/\s/g, '') !== selectedMethod.accountNumber.replace(/\s/g, '')) {
                throw new Error(`رقم الحساب في الإيصال (${result.accountNumber}) لا يطابق الرقم المتوقع.`);
            }

            if (!result.transactionReference) {
                throw new Error("لم يتمكن النظام من استخراج رقم مرجعي من الإيصال للتحقق من التكرار.");
            }
            
            const receiptRef = doc(firestore, 'processedReceipts', result.transactionReference);
            const receiptDoc = await getDoc(receiptRef);
            if (receiptDoc.exists()) {
                throw new Error(`هذا الإيصال تم استخدامه مسبقًا في تاريخ ${new Date(receiptDoc.data().processedAt).toLocaleString()}.`);
            }

            // If all checks pass, proceed with database operations
            const batch = writeBatch(firestore);
            const now = new Date().toISOString();

            // 1. Update user's balance
            batch.update(userDocRef, { balance: increment(result.amount) });

            // 2. Create a transaction record
            const userTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
            batch.set(userTransactionRef, {
              userId: user.uid,
              transactionDate: now,
              amount: result.amount,
              transactionType: `تغذية رصيد (إيصال)`,
              notes: `رقم مرجع العملية: ${result.transactionReference}`,
            });
        
            // 3. Mark receipt as processed to prevent duplicates
            batch.set(receiptRef, {
              id: result.transactionReference,
              userId: user.uid,
              processedAt: now,
              amount: result.amount,
            });
            
            await batch.commit();

            setProcessedAmount(result.amount);
            setShowSuccess(true);
            
            toast({
                title: 'تمت المعالجة بنجاح!',
                description: `تم إيداع مبلغ ${result.amount.toLocaleString('en-US')} ريال في حسابك.`,
            });
            
        } catch (error: any) {
            console.error("Receipt processing failed:", error);
            toast({ variant: 'destructive', title: 'فشلت المعالجة', description: error.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const isLoading = isLoadingMethods;
    
    if (showSuccess) {
      return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold">تم الإيداع بنجاح</h2>
                        <p className="text-lg font-semibold text-primary">{processedAmount.toLocaleString('en-US')} ريال يمني</p>
                        <p className="text-sm text-muted-foreground">تمت إضافة المبلغ إلى رصيدك بنجاح.</p>
                        <div className="w-full pt-4">
                            <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      );
    }

    const renderPaymentMethods = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-2 gap-4 px-4">
                    {[...Array(2)].map((_, i) => (
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
                                ? 'border-primary shadow-lg bg-primary/5' 
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
                           <h2 className="text-lg font-bold">3. إرفاق الإيصال</h2>
                           <p className="text-sm text-muted-foreground mt-1">بعد التحويل, ارفع صورة الإيصال ليتم التحقق منها وإضافة الرصيد.</p>
                           <Card className="mt-4">
                               <CardContent className="p-4 space-y-4">
                                    <div>
                                        <label htmlFor="receipt-upload" className="block text-sm font-medium text-muted-foreground mb-2">اختر صورة الإيصال</label>
                                        <Input
                                            id="receipt-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                        />
                                        {receiptFile && <p className="text-xs text-muted-foreground mt-2">الملف المحدد: {receiptFile.name}</p>}
                                    </div>
                                    <Button className="w-full h-12 text-base" onClick={handleProcessReceipt} disabled={isProcessing || !receiptFile}>
                                        {isProcessing ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Upload className="ml-2 h-5 w-5" />}
                                        {isProcessing ? 'جاري المعالجة...' : 'رفع وتأكيد الإيداع'}
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
