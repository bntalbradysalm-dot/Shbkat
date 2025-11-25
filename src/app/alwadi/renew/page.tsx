'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, CreditCard } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

export default function RenewPage() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title');
  const price = searchParams.get('price');
  
  const [subscriberName, setSubscriberName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const handleConfirmClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (subscriberName && cardNumber) {
      setShowDialog(true);
    } else {
      // Optionally, show an error message if fields are empty
      alert("الرجاء إدخال اسم المشترك ورقم الكرت");
    }
  };
  
  const handleFinalConfirmation = () => {
    // Here you would typically handle the actual renewal logic
    console.log("Renewal confirmed for:", { subscriberName, cardNumber, price });
    setShowDialog(false);
    // Maybe show a success message and navigate away
  };


  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title={title || 'تجديد الاشتراك'} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">{title}</CardTitle>
            {price && (
              <p className="text-center text-2xl font-bold text-primary">
                {Number(price).toLocaleString('en-US')} ريال
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="subscriberName"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  اسم المشترك
                </Label>
                <Input
                  id="subscriberName"
                  type="text"
                  placeholder="ادخل اسم المشترك"
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  رقم الكرت
                </Label>
                <Input
                  id="cardNumber"
                  type="text"
                  inputMode="numeric"
                  placeholder="ادخل رقم الكرت"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
              </div>

               <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
                <AlertDialogTrigger asChild>
                   <Button className="w-full" onClick={handleConfirmClick}>
                      تأكيد التجديد
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">تأكيد معلومات التجديد</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4 pt-4 text-base text-foreground">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{subscriberName}</span>
                          <span>اسم المشترك:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{cardNumber}</span>
                          <span>رقم الكرت:</span>
                        </div>
                         <div className="flex justify-between items-center">
                           <span className="font-bold text-primary">{Number(price).toLocaleString('en-US')} ريال</span>
                           <span>المبلغ:</span>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row justify-center gap-2 pt-4">
                    <AlertDialogAction className="flex-1" onClick={handleFinalConfirmation}>تأكيد</AlertDialogAction>
                    <AlertDialogCancel className="flex-1 mt-0">إلغاء</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
