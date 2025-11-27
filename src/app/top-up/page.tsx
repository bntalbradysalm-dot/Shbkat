'use client';

import React, { useState, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type PaymentMethod = {
  id: string;
  name: string;
  accountNumber: string;
  logoUrl?: string;
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
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

    const methodsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'paymentMethods') : null),
        [firestore]
    );
    const { data: methods, isLoading } = useCollection<PaymentMethod>(methodsCollection);

    // Set the first method as selected by default
    React.useEffect(() => {
        if (!selectedMethod && methods && methods.length > 0) {
            setSelectedMethod(methods[0]);
        }
    }, [methods, selectedMethod]);

    const handleCopy = (accountNumber: string) => {
        navigator.clipboard.writeText(accountNumber);
        toast({
            title: "تم النسخ",
            description: "تم نسخ رقم الحساب بنجاح.",
        });
    };
    
    const openWhatsApp = () => {
        const phoneNumber = '967770326828';
        const message = encodeURIComponent('أرغب في تأكيد عملية إيداع. هذا هو إيصال الدفع.');
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;
        window.open(whatsappUrl, '_blank');
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

        if (!methods || methods.length === 0) {
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
                {methods.map(method => (
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
                                        <p className="text-lg font-bold">{selectedMethod.name}</p>
                                    </div>
                                    <div className="flex items-center justify-center bg-muted p-3 rounded-lg gap-2">
                                        <Button variant="ghost" onClick={() => handleCopy(selectedMethod.accountNumber)}>
                                            <Copy className="ml-2 h-4 w-4" />
                                            نسخ
                                        </Button>
                                        <p className="text-xl font-mono tracking-wider">{selectedMethod.accountNumber}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    
                    {selectedMethod && (
                       <div className="animate-in fade-in-0 duration-300 delay-150 px-4 pb-4">
                           <h2 className="text-lg font-bold">3. أرسل الإيصال عبر واتساب</h2>
                           <p className="text-sm text-muted-foreground mt-1">بعد التحويل يرجى رفع صورة الايصال عبر واتساب لتاكيد الدفع واضافة المبلغ الى رصيدك</p>
                           <Card className="mt-4">
                               <CardContent className="p-4">
                                   <Button className="w-full" onClick={openWhatsApp}>
                                       <Send className="ml-2 h-4 w-4" />
                                       رفع الإيصال عبر واتساب
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
