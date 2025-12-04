'use client';

import React, { useState, useMemo, ChangeEvent, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, increment, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Send, Upload, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { processReceipt } from '@/ai/flows/process-receipt-flow';
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
    balance?: number;
};

const getLogoSrc = (url?: string) => {
    if (url && (url.startsWith('http') || url.startsWith('/'))) {
      return url;
    }
    return 'https://placehold.co/100x100/e2e8f0/e2e8f0'; 
};

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
};

export default function TopUpPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    
    const [amount, setAmount] = useState('');
    const [receiptImage, setReceiptImage] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [finalBalance, setFinalBalance] = useState(0);

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

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReceiptImage(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };
    
   const handleDeposit = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح للإيداع.' });
            return;
        }
        if (!receiptImage) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء اختيار صورة إيصال التحويل.' });
            return;
        }
        if (!user || !userProfile || !selectedMethod) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'معلومات المستخدم أو طريقة الدفع غير متوفرة.' });
            return;
        }

        setIsProcessing(true);

        try {
            const dataUri = await fileToDataUri(receiptImage);
            const aiResult = await processReceipt({
                receiptImage: dataUri,
                userId: user.uid,
                userName: userProfile.displayName || '',
                userPhoneNumber: userProfile.phoneNumber || '',
                expectedRecipientName: selectedMethod.accountHolderName,
            });

            if (!aiResult.isReceipt) {
                throw new Error("الصورة لا تبدو كإيصال صحيح.");
            }
             if (!aiResult.transactionReference) {
                throw new Error("لم يتم العثور على رقم عملية في الإيصال. تأكد من وضوح الصورة.");
            }

            if (!aiResult.isNameMatch) {
                throw new Error(`اسم المستلم في الإيصال لا يتطابق مع "${selectedMethod.accountHolderName}".`);
            }

            // Check for duplicate receipt
            const receiptRef = doc(firestore, "processedReceipts", aiResult.transactionReference);
            const receiptSnap = await getDoc(receiptRef);
            if (receiptSnap.exists()) {
                throw new Error("هذا الإيصال قد تم استخدامه من قبل.");
            }
            
            const extractedAmount = aiResult.amount;

            const batch = writeBatch(firestore);

            // 1. Update user balance
            batch.update(userDocRef, { balance: increment(numericAmount) });

            // 2. Add transaction record
            const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
            batch.set(transactionRef, {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: numericAmount,
                transactionType: 'تغذية رصيد (آلي)',
                notes: `إيداع إلى ${selectedMethod.name}. المستلم المؤكد: ${aiResult.recipientName}.`,
            });
            
            // 3. Mark receipt as processed to prevent duplicates
            batch.set(receiptRef, {
                userId: user.uid,
                processedAt: new Date().toISOString(),
                amount: numericAmount,
            });

            await batch.commit();
            
            const newBalance = (userProfile.balance || 0) + numericAmount;
            setFinalBalance(newBalance);
            setShowSuccess(true);

        } catch (error: any) {
            console.error('Error processing deposit:', error);
            toast({
                variant: 'destructive',
                title: 'فشل معالجة الإيداع',
                description: error.message || 'حدث خطأ أثناء فحص الإيصال. الرجاء التأكد من وضوح الصورة والمحاولة مرة أخرى.',
            });
        } finally {
            setIsProcessing(false);
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
                            <h2 className="text-xl font-bold">تم الإيداع بنجاح</h2>
                            <p className="text-sm text-muted-foreground">تمت إضافة المبلغ إلى رصيدك.</p>

                            <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">المبلغ المضاف:</span>
                                    <span className="font-bold text-green-600">{Number(amount).toLocaleString('en-US')} ريال</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">الرصيد الجديد:</span>
                                    <span className="font-semibold">{finalBalance.toLocaleString('en-US')} ريال</span>
                                </div>
                            </div>
                            <Button className="w-full mt-4" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isLoading = isLoadingMethods;

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
                           <h2 className="text-lg font-bold">3. تأكيد الإيداع</h2>
                           <p className="text-sm text-muted-foreground mt-1">أدخل المبلغ وأرفق الإيصال ليتم فحصها آلياً.</p>
                           <Card className="mt-4">
                               <CardContent className="p-4 space-y-4">
                                    <div>
                                        <label htmlFor="deposit-amount" className="text-sm font-medium">المبلغ المحوّل</label>
                                        <Input 
                                            id="deposit-amount"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="mt-1"
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="receipt-upload" className="text-sm font-medium">إيصال التحويل</label>
                                        <label htmlFor="receipt-upload" className="mt-1 flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                                            {receiptPreview ? (
                                                <Image src={receiptPreview} alt="معاينة الإيصال" width={100} height={100} className="object-contain rounded-md" />
                                            ) : (
                                                <div className="text-center text-muted-foreground">
                                                    <ImageIcon className="mx-auto h-8 w-8" />
                                                    <p className="mt-1 text-xs">انقر لرفع صورة الإيصال</p>
                                                </div>
                                            )}
                                        </label>
                                        <Input id="receipt-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isProcessing} />
                                    </div>
                                    
                                    <Button className="w-full h-12 text-base" onClick={handleDeposit} disabled={!amount || !receiptImage || isProcessing}>
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                                جاري فحص الإيصال...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="ml-2 h-4 w-4" />
                                                تأكيد الإيداع
                                            </>
                                        )}
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
