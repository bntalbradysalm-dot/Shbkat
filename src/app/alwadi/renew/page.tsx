'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, CreditCard, CheckCircle, Wallet, FileText } from 'lucide-react';
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
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, updateDoc, increment, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

type UserProfile = {
  balance?: number;
};

export default function RenewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const title = searchParams.get('title');
  const price = searchParams.get('price');
  
  const [subscriberName, setSubscriberName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [remainingBalance, setRemainingBalance] = useState(0);


  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handleConfirmClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (subscriberName && cardNumber) {
      setShowDialog(true);
    } else {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال اسم المشترك ورقم الكرت",
      });
    }
  };
  
  const handleFinalConfirmation = async () => {
    if (!user || !firestore || !price || !userProfile || isProcessing) return;

    const renewalPrice = Number(price);
    const currentUserBalance = userProfile.balance ?? 0;

    if (currentUserBalance < renewalPrice) {
      toast({
        variant: "destructive",
        title: "رصيد غير كافٍ",
        description: `رصيدك الحالي ${currentUserBalance.toLocaleString()} ريال، وهو لا يكفي لإتمام العملية.`,
      });
      setShowDialog(false);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Deduct balance
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        balance: increment(-renewalPrice),
      });
      
      const newBalance = currentUserBalance - renewalPrice;
      setRemainingBalance(newBalance);


      // 2. Record transaction
      const transactionsRef = collection(firestore, 'users', user.uid, 'transactions');
      const transactionData = {
        userId: user.uid,
        transactionDate: new Date().toISOString(),
        amount: renewalPrice,
        transactionType: 'تجديد الوادي',
        notes: `تجديد باقة "${title}" للمشترك ${subscriberName} (كرت: ${cardNumber})`,
      };
      
      await addDocumentNonBlocking(transactionsRef, transactionData);
      
      setShowSuccessOverlay(true);

    } catch (error) {
      console.error("Renewal failed:", error);
      toast({
        variant: "destructive",
        title: "فشل التجديد",
        description: "حدث خطأ أثناء محاولة تجديد الاشتراك. الرجاء المحاولة مرة أخرى.",
      });
    } finally {
      setIsProcessing(false);
      setShowDialog(false);
    }
  };
  
  if (showSuccessOverlay) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
        <Card className="w-full max-w-sm text-center shadow-2xl">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold">تم تجديد كرتك بنجاح</h2>
                    
                    <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg">
                       <div className="flex justify-between">
                            <span className="text-muted-foreground">الفئة:</span>
                            <span className="font-semibold">{title}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">المبلغ المدفوع:</span>
                            <span className="font-semibold text-destructive">{Number(price).toLocaleString('en-US')} ريال</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">الرصيد المتبقي:</span>
                            <span className="font-semibold text-primary">{remainingBalance.toLocaleString('en-US')} ريال</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-3 pt-4">
                        <Button variant="outline" onClick={() => router.push('/transactions')}>
                           <FileText className="ml-2 h-4 w-4"/>
                           العمليات
                        </Button>
                        <Button onClick={() => router.push('/')}>إغلاق</Button>
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
                   <Button className="w-full" onClick={handleConfirmClick} disabled={isProcessing}>
                      {isProcessing ? 'جاري المعالجة...' : 'تأكيد التجديد'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">تأكيد معلومات التجديد</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4 pt-4 text-base text-foreground">
                        <div className="flex justify-between items-center">
                          <span>اسم المشترك:</span>
                          <span className="font-bold">{subscriberName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>رقم الكرت:</span>
                          <span className="font-bold">{cardNumber}</span>
                        </div>
                         <div className="flex justify-between items-center">
                           <span>المبلغ:</span>
                           <span className="font-bold text-primary">{Number(price).toLocaleString('en-US')} ريال</span>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row justify-center gap-2 pt-4">
                    <AlertDialogAction className="flex-1" onClick={handleFinalConfirmation} disabled={isProcessing}>
                      {isProcessing ? 'جاري التأكيد...' : 'تأكيد'}
                    </AlertDialogAction>
                    <AlertDialogCancel className="flex-1 mt-0" disabled={isProcessing}>إلغاء</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    <Toaster />
    </>
  );
}
