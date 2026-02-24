
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  User, 
  CreditCard, 
  CheckCircle, 
  History, 
  Wallet,
  Hash,
  Sparkles,
  Info
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type RenewalOption = {
  id: string;
  title: string;
  price: number;
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

export default function AlwadiPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [subscriberName, setSubscriberName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [selectedOption, setSelectedOption] = useState<RenewalOption | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalRemainingBalance, setFinalRemainingBalance] = useState(0);

  // تحديث الشعار بناءً على طلب المستخدم (هنا فقط)
  const ALWADI_LOGO = "https://i.postimg.cc/MKMWP3VG/15.jpg";

  // User Profile
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  // Renewal Options
  const optionsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'alwadiOptions'), orderBy('price', 'asc')) : null),
    [firestore]
  );
  const { data: options, isLoading: isLoadingOptions } = useCollection<RenewalOption>(optionsCollection);

  useEffect(() => {
    if (showSuccess && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [showSuccess]);

  const handleRenewClick = () => {
    if (!subscriberName || !cardNumber) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "الرجاء إدخال اسم المشترك ورقم الكرت أولاً.",
      });
      return;
    }
    if (!selectedOption) {
      toast({
        variant: "destructive",
        title: "لم يتم اختيار باقة",
        description: "الرجاء اختيار باقة التجديد المطلوبة.",
      });
      return;
    }
    if ((userProfile?.balance ?? 0) < selectedOption.price) {
      toast({
        variant: "destructive",
        title: "رصيد غير كافٍ",
        description: "رصيدك الحالي لا يكفي لإتمام هذه العملية.",
      });
      return;
    }
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    if (!user || !firestore || !selectedOption || !userProfile || !userDocRef) return;

    setIsProcessing(true);
    setIsConfirming(false);

    const currentBalance = userProfile.balance ?? 0;
    const renewalRequestData = {
      userId: user.uid,
      userName: userProfile.displayName || 'مستخدم',
      userPhoneNumber: userProfile.phoneNumber || '000',
      packageTitle: selectedOption.title,
      packagePrice: selectedOption.price,
      subscriberName: subscriberName,
      cardNumber: cardNumber,
      status: 'pending',
      requestTimestamp: new Date().toISOString(),
    };

    try {
      const batch = writeBatch(firestore);
      
      // 1. Deduct balance
      batch.update(userDocRef, {
        balance: increment(-selectedOption.price),
      });

      // 2. Create renewal request
      const renewalRequestsRef = collection(firestore, 'renewalRequests');
      batch.set(doc(renewalRequestsRef), renewalRequestData);
      
      await batch.commit();
      
      setFinalRemainingBalance(currentBalance - selectedOption.price);
      setShowSuccess(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "فشل الطلب",
        description: error.message || "حدث خطأ أثناء إرسال الطلب.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري إرسال طلبك..." />;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4 animate-in fade-in-0">
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
        <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
            <div className="bg-green-500 p-8 flex justify-center">
                <div className="bg-white/20 p-4 rounded-full animate-bounce">
                    <CheckCircle className="h-16 w-16 text-white" />
                </div>
            </div>
            <CardContent className="p-8 space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-green-600">تم إرسال طلبك بنجاح</h2>
                    <p className="text-sm text-muted-foreground mt-1">سيتم تفعيل كرتك في أقرب وقت</p>
                </div>

                <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> الفئة:</span>
                        <span className="font-bold">{selectedOption?.title}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> المبلغ المخصوم:</span>
                        <span className="font-black text-primary">{selectedOption?.price.toLocaleString('en-US')} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">الرصيد المتبقي:</span>
                        <span className="font-bold">{finalRemainingBalance.toLocaleString('en-US')} ريال</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => router.push('/login')}>الرئيسية</Button>
                    <Button className="rounded-2xl h-12 font-bold" onClick={() => router.push('/transactions')}>
                        <History className="ml-2 h-4 w-4" /> العمليات
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <SimpleHeader title="منظومة الوادي" />
      <div className="flex-1 overflow-y-auto pb-24">
        
        {/* Modern Header Logo Section */}
        <div className="bg-mesh-gradient pt-8 pb-12 px-6 rounded-b-[50px] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col items-center text-center space-y-4">
                <div className="bg-white p-1 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-700 overflow-hidden">
                    <div className="relative h-24 w-24 rounded-[28px] overflow-hidden">
                        <Image 
                            src={ALWADI_LOGO}
                            alt="Alwadi Logo" 
                            fill 
                            className="object-cover"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">تجديد اشتراك الوادي</h2>
                    <div className="flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-[10px] text-white/80 font-bold uppercase tracking-[0.2em]">نظام التجديد اليدوي المعتمد</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="px-4 -mt-8 space-y-6">
            {/* Input Form Card */}
            <Card className="rounded-[32px] border-none shadow-2xl bg-card overflow-hidden">
                <CardContent className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subscriberName" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">اسم المشترك</Label>
                            <div className="relative">
                                <Input
                                    id="subscriberName"
                                    placeholder="ادخل اسم صاحب الكرت"
                                    value={subscriberName}
                                    onChange={(e) => setSubscriberName(e.target.value)}
                                    className="h-12 rounded-2xl bg-muted/20 border-none focus-visible:ring-primary pr-11 font-bold"
                                />
                                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-60" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cardNumber" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">رقم الكرت</Label>
                            <div className="relative">
                                <Input
                                    id="cardNumber"
                                    type="tel"
                                    placeholder="ادخل رقم الكرت المكون من أرقام"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                    className="h-12 rounded-2xl bg-muted/20 border-none focus-visible:ring-primary pr-11 font-bold tracking-widest"
                                />
                                <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-60" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Packages Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        اختر فئة التجديد
                    </h3>
                    <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/5">
                        <Wallet className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-primary">{(userProfile?.balance ?? 0).toLocaleString()} ر.ي</span>
                    </div>
                </div>

                {isLoadingOptions ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-[28px]" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 pb-4">
                        {options?.map((option, index) => (
                            <button
                                key={option.id}
                                onClick={() => setSelectedOption(option)}
                                className={cn(
                                    "relative p-4 rounded-[28px] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 text-center group",
                                    selectedOption?.id === option.id
                                        ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "bg-white dark:bg-slate-900 border-transparent shadow-sm hover:border-primary/30"
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className={cn(
                                    "p-1 rounded-xl mb-1 transition-colors overflow-hidden",
                                    selectedOption?.id === option.id ? "bg-white/20" : "bg-primary/5"
                                )}>
                                    <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                                        <Image 
                                            src={ALWADI_LOGO}
                                            alt="Category Logo" 
                                            fill 
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                                <span className={cn("text-[11px] font-black", selectedOption?.id === option.id ? "text-white" : "text-foreground")}>
                                    {option.title}
                                </span>
                                <div className={cn(
                                    "font-black text-base mt-1",
                                    selectedOption?.id === option.id ? "text-white" : "text-primary"
                                )}>
                                    {option.price.toLocaleString()}
                                    <span className="text-[9px] mr-1 opacity-70">ر.ي</span>
                                </div>
                                {selectedOption?.id === option.id && (
                                    <div className="absolute -top-1 -left-1">
                                        <CheckCircle className="w-5 h-5 text-white fill-primary" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Button */}
            <div className="fixed bottom-24 left-0 right-0 px-6 animate-in slide-in-from-bottom-10">
                <Button 
                    className="w-full h-14 rounded-3xl font-black text-lg shadow-xl shadow-primary/20"
                    onClick={handleRenewClick}
                    disabled={!selectedOption || !subscriberName || !cardNumber}
                >
                    تجديد الآن
                </Button>
            </div>

            {/* Important Info */}
            <div className="bg-primary/5 p-5 rounded-[32px] border border-primary/10 space-y-3 mb-32">
                <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    تنبيهات هامة:
                </h4>
                <ul className="text-[10px] text-muted-foreground leading-relaxed list-disc pr-4 space-y-1 font-bold">
                    <li>يتم خصم المبلغ من رصيدك فور إرسال الطلب.</li>
                    <li>سيقوم فريق الدعم بتنفيذ الطلب وتجديد كرتك في أقرب وقت.</li>
                    <li>في حال رفض الطلب، سيتم إعادة المبلغ تلقائياً إلى محفظتك.</li>
                </ul>
            </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[40px] max-w-sm">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black">تأكيد معلومات التجديد</AlertDialogTitle>
                <div className="py-4 space-y-3 text-right text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><User className="w-3 h-3"/> اسم المشترك:</span>
                        <span className="font-bold">{subscriberName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3 h-3"/> رقم الكرت:</span>
                        <span className="font-mono font-bold">{cardNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><Sparkles className="w-3 h-3"/> الفئة المختارة:</span>
                        <span className="font-bold">{selectedOption?.title}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-muted/50 rounded-2xl px-3 mt-2">
                        <span className="font-black">المبلغ المخصوم:</span>
                        <span className="font-black text-primary text-xl">{selectedOption?.price.toLocaleString()} ريال</span>
                    </div>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleFinalSubmit} className="w-full rounded-2xl h-12 font-bold shadow-lg">
                    تأكيد وإرسال
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
