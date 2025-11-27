'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Upload } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

type PaymentMethod = {
  id: string;
  name: string;
  accountNumber: string;
  logoUrl?: string;
};

export default function TopUpPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const methodsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'paymentMethods') : null),
    [firestore]
  );
  const { data: paymentMethods, isLoading } = useCollection<PaymentMethod>(methodsCollection);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ', description: 'تم نسخ رقم الحساب بنجاح.' });
  };
  
  const handleWhatsAppRedirect = () => {
    const whatsappNumber = "967770326828";
    const message = "أرغب في تأكيد عملية الدفع وإضافة المبلغ إلى رصيدي. هذه صورة الإيصال:";
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getLogoSrc = (url?: string) => {
    if (url && url.trim() !== '') return url;
    return 'https://placehold.co/40x40/f8f8f9/333333?text=?';
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="غذي حسابك" />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground text-center mb-4">1. اختر طريقة الدفع</h3>
            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl"/>)}
                </div>
            ) : (
                <div className="space-y-4">
                {paymentMethods?.map((method) => (
                    <Card key={method.id} className="p-4 shadow-sm">
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-4'>
                                <Image src={getLogoSrc(method.logoUrl)} alt={method.name} width={40} height={40} className="rounded-full object-contain" />
                                <div>
                                    <p className="font-bold text-sm">{method.name}</p>
                                    <p className="text-xs text-muted-foreground">رقم الحساب</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-primary tracking-wider">{method.accountNumber}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(method.accountNumber)}>
                                    <Copy className="h-4 w-4 text-muted-foreground"/>
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
                </div>
            )}
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground text-center mb-4">2. قم بتأكيد الدفع</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">بعد التحويل، يرجى رفع صورة الإيصال عبر واتساب لتأكيد الدفع وإضافة المبلغ إلى رصيدك.</p>
            <Button className="w-full h-12" onClick={handleWhatsAppRedirect}>
                <Upload className="ml-2 h-5 w-5"/>
                رفع الإيصال عبر واتساب
            </Button>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}
