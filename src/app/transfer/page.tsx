'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, User, CheckCircle, Search, Loader2 } from 'lucide-react';
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
import { useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  id: string;
  balance?: number;
  phoneNumber?: string;
  displayName?: string;
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
        <Card className="shadow-lg">
            <CardContent className="p-4 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                         <Wallet className="h-6 w-6 text-primary dark:text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">رصيدك الحالي</span>
                </div>
                {isLoading ? (
                    <Skeleton className="h-7 w-28" />
                ) : (
                    <div className="text-xl font-bold text-primary dark:text-primary-foreground">
                        {(userProfile?.balance ?? 0).toLocaleString('en-US')}
                        <span className="text-sm mr-1">ريال يمني</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


export default function TransferPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [recipientPhone, setRecipientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: senderProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const handleSearch = async () => {
      if (recipientPhone.length !== 9 || !firestore) {
        setRecipient(null);
        return;
      }
      if (recipientPhone === senderProfile?.phoneNumber) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'لا يمكنك التحويل إلى نفسك.' });
        setRecipient(null);
        return;
      }
      
      setIsSearching(true);
      setRecipient(null);

      try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('phoneNumber', '==', recipientPhone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'المستخدم غير موجود', description: 'لم يتم العثور على مستخدم بهذا الرقم.', duration: 2000 });
            setRecipient(null);
        } else {
            const recipientData = querySnapshot.docs[0].data() as UserProfile;
            recipientData.id = querySnapshot.docs[0].id;
            setRecipient(recipientData);
        }
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'خطأ', description: 'حدث خطأ أثناء البحث عن المستخدم.' });
      } finally {
        setIsSearching(false);
      }
    };
    
    // Debounce search
    const timerId = setTimeout(() => {
        handleSearch();
    }, 500);

    return () => clearTimeout(timerId);

  }, [recipientPhone, firestore, senderProfile?.phoneNumber, toast]);

  
  const handleConfirmClick = () => {
    const numericAmount = parseFloat(amount);
    if (!recipient || !amount || isNaN(numericAmount) || numericAmount <= 0) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال مبلغ صحيح." });
      return;
    }
    if ((senderProfile?.balance ?? 0) < numericAmount) {
      toast({ variant: "destructive", title: "رصيد غير كاف!", description: "رصيدك الحالي لا يكفي لإتمام هذه العملية." });
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalConfirmation = async () => {
    if (!user || !senderProfile || !recipient || !firestore) return;

    setIsProcessing(true);
    const numericAmount = parseFloat(amount);
    
    const transferRequestsRef = collection(firestore, 'transferRequests');
    const transferRequestData = {
      fromUserId: user.uid,
      fromUserName: senderProfile.displayName || 'مستخدم',
      fromUserPhone: senderProfile.phoneNumber || 'غير معروف',
      toUserId: recipient.id,
      toUserName: recipient.displayName || 'مستخدم',
      toUserPhone: recipient.phoneNumber || 'غير معروف',
      amount: numericAmount,
      status: 'pending',
      requestTimestamp: new Date().toISOString(),
    };

    try {
      await addDocumentNonBlocking(transferRequestsRef, transferRequestData);
      setShowSuccess(true);
    } catch (error) {
      console.error("Transfer request failed: ", error);
      toast({ variant: 'destructive', title: 'فشل إرسال الطلب', description: 'حدث خطأ غير متوقع أثناء إرسال طلب التحويل.' });
    } finally {
      setIsProcessing(false);
      setIsConfirming(false);
    }
  };
  
  if (showSuccess) {
    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
        <Card className="w-full max-w-sm text-center shadow-2xl">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold">تم إرسال الطلب بنجاح</h2>
                     <p className="text-sm text-muted-foreground">سيقوم المسؤول بمراجعة طلبك وإتمام عملية التحويل.</p>
                    <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2">
                       <div className="flex justify-between">
                            <span className="text-muted-foreground">المستلم:</span>
                            <span className="font-semibold">{recipient?.displayName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">المبلغ:</span>
                            <span className="font-semibold text-primary dark:text-primary-foreground">{Number(amount).toLocaleString('en-US')} ريال</span>
                        </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-3 pt-4">
                        <Button variant="outline" onClick={() => router.push('/')}>الرئيسية</Button>
                        <Button onClick={() => {
                            setShowSuccess(false);
                            setRecipient(null);
                            setRecipientPhone('');
                            setAmount('');
                        }} variant="default">
                           تحويل جديد
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="تحويل لمشترك" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">تفاصيل التحويل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="recipientPhone" className="text-muted-foreground">رقم المستلم</Label>
              <div className="relative">
                <Input
                  id="recipientPhone"
                  type="tel"
                  placeholder="77xxxxxxxx"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  disabled={isProcessing}
                  maxLength={9}
                />
                 {isSearching && <Loader2 className="animate-spin absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
            
            {recipient && (
                <div className="p-3 bg-muted rounded-lg flex items-center gap-3 animate-in fade-in-0">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm font-semibold">المستلم: <span className="text-primary dark:text-primary-foreground">{recipient.displayName}</span></p>
                </div>
            )}

            {recipient && (
                <div className="animate-in fade-in-0">
                  <Label htmlFor="amount" className="text-muted-foreground">المبلغ</Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode='numeric'
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
            )}

            <Button onClick={handleConfirmClick} className="w-full h-12 text-lg font-bold" disabled={!recipient || !amount || isProcessing}>
                <Send className="ml-2 h-5 w-5"/>
                تحويل
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
    <Toaster />

    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center">تأكيد عملية التحويل</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div className="space-y-4 pt-4 text-base text-foreground text-center">
                         <p className="text-sm text-center text-muted-foreground pb-2">هل أنت متأكد من رغبتك في تحويل مبلغ</p>
                         <p className="text-2xl font-bold text-primary dark:text-primary-foreground">{Number(amount).toLocaleString('en-US')} ريال</p>
                         <p className="text-sm text-center text-muted-foreground">إلى</p>
                         <p className="font-bold">{recipient?.displayName}</p>
                         <p className="text-sm text-muted-foreground">({recipient?.phoneNumber})</p>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row justify-center gap-2 pt-4">
                <AlertDialogAction className="flex-1" onClick={handleFinalConfirmation} disabled={isProcessing}>
                    {isProcessing ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال الطلب'}
                </AlertDialogAction>
                <AlertDialogCancel className="flex-1 mt-0" disabled={isProcessing}>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
