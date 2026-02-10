'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { collection, doc, query, where, getDocs, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';


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


export default function TransferPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const commission = 100;

  const [recipientPhone, setRecipientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const senderDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: senderProfile } = useDoc<UserProfile>(senderDocRef);

  useEffect(() => {
    if (showSuccess && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [showSuccess]);

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
    if ((senderProfile?.balance ?? 0) < numericAmount + commission) {
        toast({ variant: "destructive", title: "رصيد غير كاف!", description: `رصيدك غير كافٍ لإتمام التحويل. المبلغ المطلوب شامل العمولة هو ${(numericAmount + commission).toLocaleString('en-US')} ريال.` });
        return;
    }
    setIsConfirming(true);
  };

  const handleFinalConfirmation = async () => {
    if (!user || !senderProfile || !recipient || !firestore || !senderProfile.displayName || !senderDocRef) return;

    setIsProcessing(true);
    const numericAmount = parseFloat(amount);
    const totalDeduction = numericAmount + commission;
    
    if ((senderProfile.balance ?? 0) < totalDeduction) {
        toast({ variant: "destructive", title: "رصيد غير كاف!", description: "رصيدك لم يعد كافياً لإتمام هذه العملية." });
        setIsProcessing(false);
        setIsConfirming(false);
        return;
    }

    try {
      const batch = writeBatch(firestore);

      // 1. Decrement sender's balance
      batch.update(senderDocRef, { balance: increment(-totalDeduction) });

      // 2. Increment recipient's balance
      const recipientDocRef = doc(firestore, 'users', recipient.id);
      batch.update(recipientDocRef, { balance: increment(numericAmount) });

      const now = new Date().toISOString();

      // 3. Create transaction log for sender for the whole amount
      const senderTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      batch.set(senderTransactionRef, {
        userId: user.uid,
        transactionDate: now,
        amount: totalDeduction,
        transactionType: `تحويل إلى ${recipient.displayName}`,
        notes: `شامل عمولة خدمات ${commission} ريال`
      });

      // 4. Create transaction log for recipient
      const recipientTransactionRef = doc(collection(firestore, 'users', recipient.id, 'transactions'));
      batch.set(recipientTransactionRef, {
        userId: recipient.id,
        transactionDate: now,
        amount: numericAmount,
        transactionType: `استلام من ${senderProfile.displayName}`,
        notes: `من رقم: ${senderProfile.phoneNumber}`
      });

      await batch.commit();

      setShowSuccess(true);
    } catch (error) {
        console.error("Failed to perform transfer:", error);
        toast({
            variant: "destructive",
            title: "فشل التحويل",
            description: "حدث خطأ أثناء محاولة تنفيذ التحويل. لم يتم خصم أي رصيد.",
        });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  if (isProcessing) {
    return <ProcessingOverlay message="جاري تنفيذ التحويل..." />;
  }
  
  if (showSuccess) {
    return (
      <>
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
        <Card className="w-full max-w-sm text-center shadow-2xl">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold">تم التحويل بنجاح</h2>
                     <p className="text-sm text-muted-foreground">تم تحويل المبلغ بنجاح.</p>
                    <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2 text-right">
                       <div className="flex justify-between">
                            <span className="text-muted-foreground">المستلم:</span>
                            <span className="font-semibold">{recipient?.displayName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">المبلغ المحول:</span>
                            <span className="font-semibold">{Number(amount).toLocaleString('en-US')} ريال</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">عمولة خدمات:</span>
                            <span className="font-semibold">{commission.toLocaleString('en-US')} ريال</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="text-muted-foreground">الإجمالي المخصوم:</span>
                            <span className="font-bold text-destructive">{(Number(amount) + commission).toLocaleString('en-US')} ريال</span>
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
    </>
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
                  placeholder="7xxxxxxxx"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  disabled={isProcessing}
                  maxLength={9}
                  className="text-right"
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

            <Button onClick={handleConfirmClick} className="w-full h-auto py-2" disabled={!recipient || !amount || isProcessing}>
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
                   <div className="space-y-2 pt-4 text-sm text-right">
                        <div className="flex justify-between items-center">
                            <span>المبلغ المراد تحويله:</span>
                            <span className="font-bold">{Number(amount).toLocaleString('en-US')} ريال</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>عمولة خدمات:</span>
                            <span className="font-bold">{commission.toLocaleString('en-US')} ريال</span>
                        </div>
                        <div className="flex justify-between items-center text-base pt-2 border-t mt-2">
                            <span className="font-semibold">الإجمالي المخصوم:</span>
                            <span className="font-bold text-lg text-destructive">{(Number(amount) + commission).toLocaleString('en-US')} ريال</span>
                        </div>
                         <div className="text-center pt-4">
                            <p className="text-sm text-muted-foreground">إلى المستلم:</p>
                            <p className="font-bold text-base">{recipient?.displayName}</p>
                            <p className="text-sm text-muted-foreground">({recipient?.phoneNumber})</p>
                        </div>
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row justify-center gap-2 pt-4">
                <AlertDialogAction className="flex-1" onClick={handleFinalConfirmation} disabled={isProcessing}>
                    {isProcessing ? 'جاري التحويل...' : 'تأكيد'}
                </AlertDialogAction>
                <AlertDialogCancel className="flex-1 mt-0" disabled={isProcessing}>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
