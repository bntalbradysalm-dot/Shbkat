
'use client';

import React, { useState, useMemo, ChangeEvent, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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

type AppSettings = {
    supportPhoneNumber?: string;
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
    
    const settingsDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'appSettings', 'global') : null),
        [firestore]
    );
    const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

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

    const handleSendReceipt = () => {
        if (!selectedMethod || !userProfile || !appSettings?.supportPhoneNumber) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'معلومات الدعم أو المستخدم غير متوفرة. لا يمكن إرسال الرسالة.',
            });
            return;
        }

        const userName = userProfile.displayName || 'غير معروف';
        const userPhone = userProfile.phoneNumber || 'غير معروف';
        const bankName = selectedMethod.name;

        const message = `مرحباً، أود تأكيد عملية إيداع.
- اسمي: ${userName}
- رقمي: ${userPhone}
- البنك: ${bankName}
- الإيصال مرفق.`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${appSettings.supportPhoneNumber}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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
                           <h2 className="text-lg font-bold">3. إرسال الإيصال</h2>
                           <p className="text-sm text-muted-foreground mt-1">بعد التحويل، أرسل الإيصال عبر واتساب لتأكيد الإيداع.</p>
                           <Card className="mt-4">
                               <CardContent className="p-4 space-y-4">
                                    <Button className="w-full h-12 text-base" onClick={handleSendReceipt} disabled={!appSettings?.supportPhoneNumber}>
                                        <Send className="ml-2 h-4 w-4" />
                                        إرسال الإيصال عبر واتساب
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
