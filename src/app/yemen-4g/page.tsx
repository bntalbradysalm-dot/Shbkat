'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, Phone, CheckCircle, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';

type UserProfile = {
  balance?: number;
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
        <Card className="shadow-md">
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

export default function Yemen4GPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [isQuerying, setIsQuerying] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const userDocRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    useEffect(() => {
        if (showSuccess && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }, [showSuccess]);

    const handleQuery = async () => {
        if (!phone) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رقم هاتف.' });
            return;
        }
        setIsQuerying(true);
        try {
            const response = await fetch('/api/yem-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, type: 'yemen4G' })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل الاستعلام.');
            const description = `الرصيد: ${result.R_CardBalance || 'غير معروف'}`;
            toast({ title: 'نتيجة الاستعلام', description });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل الاستعلام', description: error.message });
        } finally {
            setIsQuerying(false);
        }
    };

    const handlePayment = async () => {
        if (!phone || !amount || !user || !userProfile || !firestore || !userDocRef) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'بيانات المستخدم أو الطلب غير مكتملة.' });
            return;
        }
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صحيح.' });
            return;
        }
        if ((userProfile.balance ?? 0) < numericAmount) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام هذه العملية.' });
            return;
        }
        setIsProcessing(true);
        try {
            const response = await fetch('/api/baitynet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, amount: numericAmount, type: 'line' }) // Assuming 'line' is correct for Yemen 4G based on old code
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشلت عملية السداد من المصدر.');
            
            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-numericAmount) });
            const transactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
            batch.set(transactionRef, {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: numericAmount,
                transactionType: 'سداد يمن فورجي',
                notes: `إلى رقم: ${phone}`,
                recipientPhoneNumber: phone
            });
            await batch.commit();
            setShowSuccess(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'فشل السداد', description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirming(false);
        }
    };

    if (isProcessing) {
        return <ProcessingOverlay message="جاري تنفيذ السداد..." />;
    }

    if (showSuccess) {
        return (
            <>
                <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
                <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                    <Card className="w-full max-w-sm text-center shadow-2xl">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="bg-green-100 p-4 rounded-full"><CheckCircle className="h-16 w-16 text-green-600" /></div>
                                <h2 className="text-2xl font-bold">تم السداد بنجاح</h2>
                                <p className="text-sm text-muted-foreground">تم سداد مبلغ {Number(amount).toLocaleString('en-US')} ريال بنجاح.</p>
                                <Button className="w-full mt-4" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full bg-background">
                <SimpleHeader title="خدمات يمن فورجي" />
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <BalanceDisplay />
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">سداد يمن فورجي</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="yemen-4g-phone" className="flex items-center gap-2 mb-1">
                                    <Phone className="h-4 w-4" />
                                    ادخل رقم الهاتف
                                </Label>
                                <Input
                                    id="yemen-4g-phone"
                                    type="tel"
                                    inputMode='numeric'
                                    placeholder="7xxxxxxx"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                    maxLength={9}
                                    className="text-right font-semibold"
                                />
                            </div>
                            <div>
                                <Label htmlFor="yemen-4g-amount" className="flex items-center gap-2 mb-1">
                                    <Wallet className="h-4 w-4" />
                                    المبلغ
                                </Label>
                                <Input
                                    id="yemen-4g-amount"
                                    type="number"
                                    inputMode='numeric'
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="text-right"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <Button variant="outline" onClick={handleQuery} disabled={isQuerying || !phone}>
                                    {isQuerying ? <Loader2 className="h-4 w-4 animate-spin ml-2"/> : null}
                                    استعلام
                                </Button>
                                <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                                    <AlertDialogTrigger asChild>
                                        <Button disabled={isProcessing || !phone || !amount}>
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin ml-2"/> : null}
                                            تسديد
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>تأكيد السداد</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                هل أنت متأكد من رغبتك في تسديد مبلغ {Number(amount).toLocaleString('en-US')} ريال للرقم {phone}؟
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
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Toaster />
        </>
    );
}
