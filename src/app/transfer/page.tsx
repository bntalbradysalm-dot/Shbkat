'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Send, User, CheckCircle, Search, Loader2, Smartphone, Users } from 'lucide-react';
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
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, increment, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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
        <Card className="overflow-hidden rounded-[28px] shadow-xl text-white border-none mb-6 bg-mesh-gradient animate-in fade-in-0 zoom-in-95 duration-500">
            <CardContent className="p-6 flex items-center justify-between">
                <div className="text-right">
                    <p className="text-[10px] font-black opacity-80 mb-1 uppercase tracking-widest">الرصيد المتوفر</p>
                    <div className="flex items-baseline gap-1">
                        <h2 className="text-3xl font-black text-white">
                            {isLoading ? <Skeleton className="h-8 w-24 bg-white/20 rounded-lg" /> : (userProfile?.balance?.toLocaleString('en-US') || '0')}
                        </h2>
                        <span className="text-[10px] font-bold opacity-70 text-white mr-1">ريال يمني</span>
                    </div>
                </div>
                {/* تم تصغير الحاوية هنا بناءً على الطلب */}
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
                    <Wallet className="h-6 w-6 text-white" />
                </div>
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
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
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
    const totalToDeduct = numericAmount + commission;
    
    if ((senderProfile.balance ?? 0) < totalToDeduct) {
        toast({ variant: "destructive", title: "رصيد غير كاف!", description: "رصيدك لم يعد كافياً لإتمام هذه العملية." });
        setIsProcessing(false);
        setIsConfirming(false);
        return;
    }

    try {
      const batch = writeBatch(firestore);

      batch.update(senderDocRef, { balance: increment(-totalToDeduct) });

      const recipientDocRef = doc(firestore, 'users', recipient.id);
      batch.update(recipientDocRef, { balance: increment(numericAmount) });

      const now = new Date().toISOString();

      const senderTransactionRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      batch.set(senderTransactionRef, {
        userId: user.uid,
        transactionDate: now,
        amount: totalToDeduct,
        transactionType: `تحويل إلى ${recipient.displayName}`,
        notes: `شامل عمولة خدمات ${commission} ريال`
      });

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

  const handleContactPick = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
        toast({
            variant: "destructive",
            title: "غير مدعوم",
            description: "متصفحك لا يدعم الوصول لجهات الاتصال.",
        });
        return;
    }

    try {
        const props = ['tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        
        if (contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
            let selectedNumber = contacts[0].tel[0];
            selectedNumber = selectedNumber.replace(/[\s\-\(\)]/g, '');
            if (selectedNumber.startsWith('+967')) selectedNumber = selectedNumber.substring(4);
            if (selectedNumber.startsWith('00967')) selectedNumber = selectedNumber.substring(5);
            if (selectedNumber.startsWith('07')) selectedNumber = selectedNumber.substring(1);
            
            setRecipientPhone(selectedNumber.slice(0, 9));
        }
    } catch (err) {
        console.error("Contacts selection failed:", err);
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
        <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
            <div className="bg-green-500 p-8 flex justify-center">
                <div className="bg-white/20 p-4 rounded-full animate-bounce">
                    <CheckCircle className="h-16 w-16 text-white" />
                </div>
            </div>
            <CardContent className="p-8 space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-green-600">تم التحويل بنجاح</h2>
                    <p className="text-sm text-muted-foreground mt-1">تمت العملية بنجاح لصالح المشترك</p>
                </div>

                <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><User className="w-3.5 h-3.5" /> المستلم:</span>
                        <span className="font-bold">{recipient?.displayName}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> المبلغ المحول:</span>
                        <span className="font-bold">{Number(amount).toLocaleString('en-US')} ريال</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground">عمولة خدمات:</span>
                        <span className="font-bold">{commission.toLocaleString('en-US')} ريال</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="font-black text-primary">الإجمالي المخصوم:</span>
                        <span className="font-black text-primary text-base">{(Number(amount) + commission).toLocaleString('en-US')} ريال</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => router.push('/login')}>الرئيسية</Button>
                    <Button className="rounded-2xl h-12 font-bold" onClick={() => {
                        setShowSuccess(false);
                        setRecipient(null);
                        setRecipientPhone('');
                        setAmount('');
                    }}>
                        تحويل جديد
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
    )
  }

  return (
    <>
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <SimpleHeader title="تحويل لمشترك" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        <BalanceDisplay />

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-primary/5 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="recipientPhone" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">رقم هاتف المستلم</Label>
              <div className="relative">
                <Input
                  id="recipientPhone"
                  type="tel"
                  placeholder="7xxxxxxxx"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  disabled={isProcessing}
                  maxLength={9}
                  className="text-center font-black text-xl h-14 rounded-2xl bg-muted/20 border-none focus-visible:ring-primary transition-all pr-12 pl-12"
                />
                <button 
                    onClick={handleContactPick}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors"
                    title="جهات الاتصال"
                >
                    <Users className="h-5 w-5" />
                </button>
                {isSearching && <Loader2 className="animate-spin absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />}
              </div>
            </div>
            
            {recipient && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4 animate-in fade-in-0 zoom-in-95 duration-300">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                        <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">اسم المستلم</p>
                        <p className="text-base font-black text-foreground">{recipient.displayName}</p>
                    </div>
                </div>
            )}

            {recipient && (
                <div className="animate-in fade-in-0 slide-in-from-top-2 duration-500">
                  <Label htmlFor="amount" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">المبلغ المراد تحويله</Label>
                  <div className="relative mt-2">
                    <Input
                        id="amount"
                        type="number"
                        inputMode='numeric'
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none text-primary placeholder:text-primary/10 focus-visible:ring-primary"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 font-black text-sm">ر.ي</div>
                  </div>
                </div>
            )}

            <Button 
                onClick={handleConfirmClick} 
                className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 transition-all active:scale-95" 
                disabled={!recipient || !amount || isProcessing}
            >
                <Send className="ml-2 h-5 w-5"/>
                تنفيذ التحويل
            </Button>
        </div>

        {recipient && amount && (
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/5 animate-in fade-in-0 duration-700">
                <p className="text-[10px] text-center text-muted-foreground font-bold">
                    سيتم خصم عمولة ثابتة قدرها <span className="text-primary font-black">{commission} ريال</span> لكل عملية تحويل.
                </p>
            </div>
        )}
      </div>
    </div>
    <Toaster />

    <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[32px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black">تأكيد عملية التحويل</AlertDialogTitle>
                <div className="space-y-3 pt-4 text-sm text-right">
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground">المبلغ المراد تحويله:</span>
                        <span className="font-bold">{Number(amount).toLocaleString('en-US')} ريال</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground">عمولة خدمات:</span>
                        <span className="font-bold">{commission.toLocaleString('en-US')} ريال</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2">
                        <span className="font-black">الإجمالي المخصوم:</span>
                        <span className="font-bold text-lg text-destructive">{(Number(amount) + commission).toLocaleString('en-US')} ريال</span>
                    </div>
                    <div className="text-center pt-4 pb-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">إلى المستلم</p>
                        <p className="font-black text-base text-primary">{recipient?.displayName}</p>
                        <p className="text-xs font-bold text-muted-foreground">({recipient?.phoneNumber})</p>
                    </div>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-4 sm:space-x-0">
                <AlertDialogAction className="w-full rounded-2xl h-12 font-bold" onClick={handleFinalConfirmation} disabled={isProcessing}>
                    {isProcessing ? 'جاري التحويل...' : 'تأكيد'}
                </AlertDialogAction>
                <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0" disabled={isProcessing}>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
