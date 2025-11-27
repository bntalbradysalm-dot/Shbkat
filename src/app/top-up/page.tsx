'use client';

import React from 'react';
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

type PaymentMethod = {
  id: string;
  name: string;
  accountNumber: string;
  logoUrl?: string;
};

const getLogoSrc = (url?: string) => {
    // Check if url is a valid looking string, otherwise return placeholder
    if (url && (url.startsWith('http') || url.startsWith('/'))) {
      return url;
    }
    // Return a transparent placeholder if no logo is available
    return 'https://placehold.co/100x100/e2e8f0/e2e8f0'; // Gray placeholder
};


export default function TopUpPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const methodsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'paymentMethods') : null),
        [firestore]
    );
    const { data: methods, isLoading } = useCollection<PaymentMethod>(methodsCollection);

    const handleCopy = (accountNumber: string) => {
        navigator.clipboard.writeText(accountNumber);
        toast({
            title: "تم النسخ",
            description: "تم نسخ رقم الحساب بنجاح.",
        });
    };
    
    const handleUploadReceipt = (accountNumber: string, bankName: string) => {
        const recipientPhoneNumber = '770326828';
        const message = `أهلًا، أرغب في تأكيد عملية إيداع.
    - المبلغ: [اكتب المبلغ هنا]
    - بنك: ${bankName}
    - حساب: ${accountNumber}
    
    مرفق إيصال التحويل. شكرًا لك.`;
        const whatsappUrl = `https://wa.me/+967${recipientPhoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4 space-y-3">
                                <div className='flex items-center gap-4'>
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className='flex-1 space-y-2'>
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </div>
                                <Skeleton className="h-10 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        if (!methods || methods.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center h-64">
                    <p className="mt-4 text-lg font-semibold">لا توجد طرق دفع متاحة</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        الرجاء إضافة طرق دفع من لوحة التحكم.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {methods.map(method => (
                    <Card key={method.id} className="overflow-hidden">
                        <CardContent className="p-4">
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-4'>
                                    <Image src={getLogoSrc(method.logoUrl)} alt={method.name} width={40} height={40} className="rounded-full object-contain bg-muted" />
                                    <div>
                                        <p className="font-bold text-sm">{method.name}</p>
                                        <p className="text-xs text-muted-foreground">رقم الحساب</p>
                                    </div>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleCopy(method.accountNumber)}>
                                    <Copy className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </div>
                            <div className="mt-3 bg-muted p-3 rounded-md text-center">
                                <p className="text-lg font-mono tracking-widest">{method.accountNumber}</p>
                            </div>
                            <Button className="w-full mt-4" onClick={() => handleUploadReceipt(method.accountNumber, method.name)}>
                                <Send className="ml-2 h-4 w-4" />
                                رفع الإيصال عبر واتساب
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };


  return (
    <>
        <div className="flex flex-col h-full bg-background">
            <SimpleHeader title="غذي حسابك" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <Card className='bg-primary/10 border-primary/20'>
                    <CardContent className='p-4'>
                        <p className='text-sm text-center text-primary-foreground/80'>
                            اختر إحدى طرق الدفع أدناه، قم بنسخ رقم الحساب، ثم قم بتحويل المبلغ المطلوب. بعد التحويل، اضغط على زر "رفع الإيصال" لإرسال تأكيد العملية عبر واتساب.
                        </p>
                    </CardContent>
                </Card>
                {renderContent()}
            </div>
        </div>
        <Toaster />
    </>
  );
}
