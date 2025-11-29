'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, User as UserIcon, Wallet, Send, Building, CheckCircle } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, increment, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

type PaymentMethod = {
    id: string;
    name: string;
    logoUrl?: string;
    accountHolderName: string;
    accountNumber: string;
};

const getLogoSrc = (url?: string) => {
    if (url && (url.startsWith('http') || url.startsWith('/'))) {
      return url;
    }
    return 'https://placehold.co/100x100/e2e8f0/e2e8f0'; 
};

export default function WithdrawPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [recipientName, setRecipientName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [amount, setAmount] = useState('');
    
    const [isConfirming, setIsConfirming] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const methodsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'paymentMethods') : null),
        [firestore]
    );
    const { data: withdrawalMethods, isLoading: isLoadingMethods } = useCollection<PaymentMethod>(methodsCollection);
    
    useEffect(() => {
        if (!selectedMethod && withdrawalMethods && withdrawalMethods.length > 0) {
            setSelectedMethod(withdrawalMethods[0]);
        }
    }, [withdrawalMethods, selectedMethod]);
    
    const balance = userProfile?.balance ?? 0;
    const isLoading = isUserLoading || isProfileLoading || isLoadingMethods;
    const numericAmount = parseFloat(amount);
    const isAmountInvalid = isNaN(numericAmount) || numericAmount <= 0;
    const isBalanceInsufficient = numericAmount > balance;
    const isButtonDisabled = isAmountInvalid || isBalanceInsufficient;

    const handleConfirmRequest = () => {
        if (!selectedMethod || !recipientName || !accountNumber || isAmountInvalid) {
            toast({ variant: "destructive", title: "بيانات غير مكتملة", description: "الرجاء تعبئة جميع الحقول بشكل صحيح." });
            return;
        }
        if (isBalanceInsufficient) {
            toast({ variant: "destructive", title: "رصيد غير كافٍ", description: "رصيدك الحالي لا يكفي لطلب هذا المبلغ." });
            return;
        }
        setIsConfirming(true);
    };

    const handleFinalConfirmation = async () => {
        if (!user || !userProfile || !selectedMethod || !firestore || isProcessing || isAmountInvalid || !userProfile.displayName || !userProfile.phoneNumber) return;

        setIsProcessing(true);

        const requestData = {
            ownerId: user.uid,
            ownerName: userProfile.displayName,
            ownerPhoneNumber: userProfile.phoneNumber,
            amount: numericAmount,
            paymentMethodName: selectedMethod.name,
            paymentMethodLogo: selectedMethod.logoUrl || '',
            recipientName,
            accountNumber,
            status: 'pending',
            requestTimestamp: new Date().toISOString()
        };

        try {
            const requestsCollection = collection(firestore, 'withdrawalRequests');
            await addDocumentNonBlocking(requestsCollection, requestData);
            setShowSuccess(true);
        } catch (error) {
            console.error("Failed to create withdrawal request:", error);
            toast({ variant: "destructive", title: "خطأ", description: "فشل إنشاء طلب السحب. الرجاء المحاولة لاحقاً." });
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
                        <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold">تم إرسال طلبك بنجاح</h2>
                        <p className="text-sm text-muted-foreground">ستتم معالجة طلب السحب الخاص بك في أقرب وقت ممكن.</p>
                        <div className="w-full pt-4">
                            <Button variant="outline" className="w-full" onClick={() => router.push('/my-network')}>العودة</Button>
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
            <SimpleHeader title="سحب الأرباح" />
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="font-medium text-muted-foreground">رصيدك من الأرباح</p>
                            {isLoading ? (
                                <Skeleton className="h-8 w-32 mt-2" />
                            ) : (
                                <p className="text-3xl font-bold text-primary mt-1">{balance.toLocaleString('en-US')} <span className="text-base">ريال</span></p>
                            )}
                        </div>
                        <Wallet className="h-8 w-8 text-primary" />
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">اختر طريقة الاستلام</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        {isLoadingMethods ? (
                            <>
                                <Skeleton className="h-32 w-full" />
                                <Skeleton className="h-32 w-full" />
                            </>
                        ) : (
                            withdrawalMethods?.map((method) => (
                                <div
                                    key={method.id}
                                    onClick={() => setSelectedMethod(method)}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 rounded-xl p-4 aspect-square cursor-pointer transition-all border-2",
                                        selectedMethod?.id === method.id
                                            ? 'border-primary shadow-lg bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                    )}
                                >
                                    <Image src={getLogoSrc(method.logoUrl)} alt={method.name} width={56} height={56} className="rounded-lg object-contain" />
                                    <p className="text-center text-xs font-semibold mt-2">{method.name}</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">تفاصيل طلب السحب</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="recipientName" className="flex items-center gap-2 mb-1">
                                <UserIcon className="h-4 w-4" />
                                اسم المستلم
                            </Label>
                            <Input id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="الاسم الكامل كما في الحساب البنكي" />
                        </div>
                        <div>
                            <Label htmlFor="accountNumber" className="flex items-center gap-2 mb-1">
                                <Building className="h-4 w-4" />
                                رقم حساب المستلم
                            </Label>
                            <Input id="accountNumber" type="number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="ادخل رقم الحساب" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <Label htmlFor="amount" className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4" />
                                    المبلغ المراد سحبه
                                </Label>
                                {isBalanceInsufficient && (
                                    <span className="text-xs font-semibold text-destructive">رصيد غير كافٍ</span>
                                )}
                            </div>
                            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                        </div>
                    </CardContent>
                </Card>

                <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                    <AlertDialogTrigger asChild>
                        <Button className="w-full h-12 text-lg" onClick={handleConfirmRequest} disabled={isButtonDisabled}>
                          <Send className="ml-2" />
                          إرسال طلب السحب
                        </Button>
                    </AlertDialogTrigger>
                    {selectedMethod && (
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد طلب السحب</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هل أنت متأكد من إرسال طلب سحب بالمبلغ والتفاصيل التالية؟
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2 py-2 text-sm">
                                <p><strong>المبلغ:</strong> <span className="text-primary font-bold">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span></p>
                                <p><strong>طريقة الاستلام:</strong> {selectedMethod.name}</p>
                                <p><strong>اسم المستلم:</strong> {recipientName}</p>
                                <p><strong>رقم الحساب:</strong> {accountNumber}</p>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={handleFinalConfirmation} disabled={isProcessing}>
                                    {isProcessing ? 'جاري الإرسال...' : 'تأكيد وإرسال'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    )}
                </AlertDialog>
            </div>
        </div>
        <Toaster />
        </>
    );
}
