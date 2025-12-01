'use client';

import React, { useState, useMemo, ChangeEvent, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Send, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
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
    
    const [amount, setAmount] = useState('');
    const [receiptImage, setReceiptImage] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    
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
        if (paymentMethods && paymentMethods.length > 0 && !selectedMethod) {
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
    
    const handleConfirmDeposit = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح للإيداع.' });
            return;
        }
        if (!receiptImage) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء اختيار صورة إيصال التحويل.' });
            return;
        }
        setShowConfirmDialog(true);
    };
    
    const handleSubmitRequest = async () => {
        if (!user || !userProfile?.displayName || !userProfile?.phoneNumber || !firestore || !receiptImage || !amount) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات المستخدم غير كاملة أو لم يتم اختيار ملف.' });
            return;
        }

        setIsProcessing(true);
        setShowConfirmDialog(false);

        try {
            // Upload image to Firebase Storage
            const storage = getStorage();
            const imageRef = storageRef(storage, `receipts/${user.uid}/${Date.now()}-${receiptImage.name}`);
            const snapshot = await uploadBytes(imageRef, receiptImage);
            const imageUrl = await getDownloadURL(snapshot.ref);

            // Add request to Firestore
            const requestsCollection = collection(firestore, 'manualDepositRequests');
            await addDocumentNonBlocking(requestsCollection, {
                userId: user.uid,
                userName: userProfile.displayName,
                userPhoneNumber: userProfile.phoneNumber,
                amount: parseFloat(amount),
                receiptImageUrl: imageUrl,
                status: 'pending',
                requestTimestamp: new Date().toISOString(),
                notes: `إلى حساب: ${selectedMethod?.name}`,
            });

            toast({
                title: 'تم إرسال طلبك',
                description: 'سيتم مراجعة طلب الإيداع الخاص بك من قبل الإدارة.',
            });
            router.push('/login');

        } catch (error) {
            console.error('Error submitting deposit request:', error);
            toast({ variant: 'destructive', title: 'فشل الإرسال', description: 'حدث خطأ أثناء إرسال طلبك. يرجى المحاولة مرة أخرى.' });
        } finally {
            setIsProcessing(false);
        }
    };

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
                           <h2 className="text-lg font-bold">3. ارفع الإيصال وأكد العملية</h2>
                           <p className="text-sm text-muted-foreground mt-1">أدخل المبلغ الذي قمت بتحويله وارفع صورة من إيصال التحويل.</p>
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
                                    
                                    <Button className="w-full h-12 text-base" onClick={handleConfirmDeposit} disabled={!amount || !receiptImage || isProcessing}>
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                                جاري إرسال الطلب...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="ml-2 h-4 w-4" />
                                                إرسال طلب الإيداع
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

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">تأكيد تفاصيل الإيداع</AlertDialogTitle>
                    <AlertDialogDescription>
                    الرجاء التأكد من صحة البيانات قبل إرسال الطلب.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-3 py-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">المبلغ:</span>
                        <span className="font-bold">{Number(amount).toLocaleString('en-US')} ريال</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">إلى حساب:</span>
                        <span className="font-bold">{selectedMethod?.name}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ اليوم:</span>
                        <span className="font-bold">{new Date().toLocaleDateString('ar-EG-u-nu-latn')}</span>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmitRequest}>تأكيد وإرسال</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
