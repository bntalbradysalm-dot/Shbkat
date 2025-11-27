'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Upload } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
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
    // Replace with your WhatsApp number and a pre-filled message
    const whatsappNumber = "967770326828";
    const message = "أرغب في تأكيد عملية الدفع وإضافة المبلغ إلى رصيدي. هذه صورة الإيصال:";
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="غذي حسابك" />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground text-center mb-4">1. اختر طريقة الدفع</h3>
            {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl"/>)}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                {paymentMethods?.map((method) => (
                    <Card key={method.id} className="p-4 flex flex-col items-center justify-center text-center rounded-xl shadow-sm">
                        {method.logoUrl && (
                            <div className="relative h-12 w-12 mb-2">
                                <Image src={method.logoUrl} alt={method.name} layout="fill" objectFit="contain" />
                            </div>
                        )}
                        <p className="font-bold text-xs">{method.name}</p>
                    </Card>
                ))}
                </div>
            )}
          </div>

          <div>
             <h3 className="text-sm font-semibold text-muted-foreground text-center mb-4">2. حوّل المبلغ إلى الحساب التالي</h3>
             <Card>
                <CardContent className="p-6 text-center space-y-3">
                     <p className="text-sm text-muted-foreground">حول إلى حساب</p>
                     <h4 className="text-lg font-bold">تطبيق كرتي</h4>
                     <div className="flex items-center justify-center gap-2 bg-muted p-3 rounded-lg">
                        <span className="text-2xl font-mono font-bold text-primary tracking-widest">1055518</span>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy('1055518')}>
                            <Copy className="h-5 w-5 text-muted-foreground"/>
                        </Button>
                     </div>
                </CardContent>
             </Card>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground text-center mb-4">3. قم بتأكيد الدفع</h3>
            <p className="text-xs text-muted-foreground text-center mb-4">بعد التحويل، يرجى رفع صورة الإيصال عبر واتساب لتأكيد الدفع وإضافة المبلغ إلى رصيدك.</p>
            <Button className="w-full h-12" onClick={handleWhatsAppRedirect}>
                <Upload className="ml-2 h-5 w-5"/>
                رفع صورة الإيصال عبر واتساب
            </Button>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}
