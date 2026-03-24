
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  CheckCircle, 
  History, 
  Wallet,
  Hash,
  LayoutGrid,
  Wifi,
  Star,
  Zap,
  Clock
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
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type RenewalOption = {
  id: string;
  title: string;
  price: number;
  groupName: string;
  discount?: number;
};

const ALSAFAA_OFFERS: RenewalOption[] = [
  { id: 'b3', title: '3 أشهر', price: 7000, groupName: 'الباقة الأساسية' },
  { id: 'b6', title: '6 أشهر', price: 14000, groupName: 'الباقة الأساسية' },
  { id: 'b12', title: '12 شهراً', price: 26000, groupName: 'الباقة الأساسية', discount: 2000 },
  { id: 'c3', title: '3 أشهر', price: 8000, groupName: 'الباقة الشاملة' },
  { id: 'c6', title: '6 أشهر', price: 16000, groupName: 'الباقة الشاملة' },
  { id: 'c12', title: '12 شهراً', price: 30000, groupName: 'الباقة الشاملة', discount: 2000 },
];

const ALSAFAA_LOGO = "https://i.postimg.cc/90nZ85Kk/20260324-221446.jpg";

export default function AlsafaaPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [selectedOption, setSelectedOption] = useState<RenewalOption | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalRemainingBalance, setFinalRemainingBalance] = useState(0);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);

  useEffect(() => {
    if (showSuccess && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  }, [showSuccess]);

  const handleRenewClick = () => {
    if (!cardNumber) {
      toast({
        variant: "destructive",
        title: "بيانات ناقصة",
        description: "الرجاء إدخال رقم الكرت أولاً.",
      });
      return;
    }
    if (!selectedOption) {
      toast({
        variant: "destructive",
        title: "لم يتم اختيار باقة",
        description: "الرجاء اختيار الفئة المطلوبة.",
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
    const now = new Date().toISOString();

    try {
      const batch = writeBatch(firestore);
      
      // 1. خصم الرصيد
      batch.update(userDocRef, { balance: increment(-selectedOption.price) });
      
      // 2. تسجيل العملية
      const txRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      batch.set(txRef, {
        userId: user.uid,
        transactionDate: now,
        amount: selectedOption.price,
        transactionType: `تجديد كرت شبكة الصفاء`,
        notes: `رقم الكرت: ${cardNumber} - ${selectedOption.groupName}: ${selectedOption.title}`,
        cardNumber: cardNumber
      });

      await batch.commit();
      
      setFinalRemainingBalance(currentBalance - selectedOption.price);
      setShowSuccess(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "فشل العملية",
        description: error.message || "حدث خطأ أثناء معالجة الطلب.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ طلبك..." />;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 zoom-in-95 duration-500">
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
        
        <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
            <div className="bg-green-500 p-8 flex justify-center">
                <div className="bg-white/20 p-4 rounded-full animate-bounce">
                    <CheckCircle className="h-16 w-16 text-white" />
                </div>
            </div>
            <CardContent className="p-8 space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-green-600">تم التجديد بنجاح</h2>
                    <p className="text-sm text-muted-foreground mt-1">شبكة الصفاء - نظام السداد المباشر</p>
                </div>

                <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> الباقة:</span>
                        <span className="font-bold">{selectedOption?.groupName} - {selectedOption?.title}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم الكرت:</span>
                        <span className="font-mono font-bold">{cardNumber}</span>
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
                    <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => router.push('/login')}>
                        الرئيسية
                    </Button>
                    <Button className="rounded-2xl h-12 font-bold" onClick={() => router.push('/transactions')}>
                        <History className="ml-2 h-4 w-4" /> العمليات
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  const groupedOffers = ALSAFAA_OFFERS.reduce((acc, offer) => {
    if (!acc[offer.groupName]) acc[offer.groupName] = [];
    acc[offer.groupName].push(offer);
    return acc;
  }, {} as Record<string, RenewalOption[]>);

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <SimpleHeader title="شبكة الصفاء" />
      <div className="flex-1 overflow-y-auto">
        
        {/* Hero Section */}
        <div className="bg-mesh-gradient pt-8 pb-12 px-6 rounded-b-[50px] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col items-center text-center space-y-4">
                <div className="bg-white p-1 rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-700 overflow-hidden border-2 border-white">
                    <div className="relative h-24 w-56 rounded-[20px] overflow-hidden">
                        <Image 
                            src={ALSAFAA_LOGO}
                            alt="Alsafaa Logo" 
                            fill 
                            className="object-contain"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">تجديد كروت شبكة الصفاء</h2>
                    <div className="flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-[10px] text-white/80 font-bold uppercase tracking-[0.2em]">نظام التفعيل المباشر</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="px-4 mt-6 space-y-8 pb-10">
            <Card className="rounded-[32px] border-none shadow-sm bg-card overflow-hidden">
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">رقم الكرت المراد تجديده</Label>
                        <div className="relative">
                            <Input
                                id="cardNumber"
                                type="tel"
                                placeholder="ادخل رقم الكرت"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                className="h-14 rounded-2xl bg-muted/20 border-none focus-visible:ring-primary pr-11 font-black text-lg text-right"
                            />
                            <Hash className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-60" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                        اختر فئة التجديد
                    </h3>
                    <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/5">
                        <Wallet className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-primary">{(userProfile?.balance ?? 0).toLocaleString()} ر.ي</span>
                    </div>
                </div>

                {Object.entries(groupedOffers).map(([groupName, offers]) => (
                  <div key={groupName} className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                      {groupName === 'الباقة الأساسية' ? <Zap className="w-4 h-4 text-blue-500" /> : <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                      <h4 className="text-sm font-black text-foreground/80">{groupName}</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {offers.map((option, index) => (
                            <button
                                key={option.id}
                                onClick={() => setSelectedOption(option)}
                                className={cn(
                                    "relative p-4 rounded-[24px] border-2 transition-all duration-300 flex items-center justify-between group overflow-hidden",
                                    selectedOption?.id === option.id
                                        ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-[1.02] text-white"
                                        : "bg-white dark:bg-slate-900 border-transparent shadow-sm hover:border-primary/30"
                                )}
                            >
                                <div className="flex items-center gap-4 text-right">
                                  <div className={cn(
                                    "p-2 rounded-xl shrink-0",
                                    selectedOption?.id === option.id ? "bg-white/20" : "bg-primary/5"
                                  )}>
                                    <Clock className={cn("w-5 h-5", selectedOption?.id === option.id ? "text-white" : "text-primary")} />
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="text-sm font-black">{option.title}</span>
                                    <span className={cn("text-[10px] font-bold", selectedOption?.id === option.id ? "text-white/70" : "text-muted-foreground")}>مدة الاشتراك</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {option.discount && (
                                    <Badge className="bg-green-500/20 text-green-600 border-none text-[9px] font-black px-2 h-5 animate-pulse">
                                      وفر {option.discount.toLocaleString()} ريال
                                    </Badge>
                                  )}
                                  <div className="text-left shrink-0">
                                      <div className={cn(
                                          "font-black text-lg",
                                          selectedOption?.id === option.id ? "text-white" : "text-primary"
                                      )}>
                                          {option.price.toLocaleString()}
                                          <span className="text-[9px] mr-1 opacity-70">ر.ي</span>
                                      </div>
                                  </div>
                                </div>

                                {selectedOption?.id === option.id && (
                                    <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-bl-full flex items-center justify-center translate-x-2 -translate-y-2">
                                        <CheckCircle className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-2">
                <Button 
                    className="w-full h-14 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-transform"
                    onClick={handleRenewClick}
                    disabled={!selectedOption || !cardNumber}
                >
                    تجديد الآن
                </Button>
            </div>
        </div>
      </div>

      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[40px] max-sm">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black">تأكيد معلومات التجديد</AlertDialogTitle>
                <div className="py-4 space-y-3 text-right text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3 h-3"/> رقم الكرت:</span>
                        <span className="font-mono font-bold">{cardNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><Star className="w-3 h-3"/> نوع الباقة:</span>
                        <span className="font-bold">{selectedOption?.groupName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-3 h-3"/> مدة التجديد:</span>
                        <span className="font-bold">{selectedOption?.title}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-muted/50 rounded-2xl px-3 mt-2">
                        <span className="font-black">المبلغ المخصوم:</span>
                        <span className="font-black text-primary text-xl">{selectedOption?.price.toLocaleString()} ريال</span>
                    </div>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                <AlertDialogAction onClick={handleFinalSubmit} className="w-full rounded-2xl h-12 font-bold shadow-lg">
                    تأكيد وإرسال
                </AlertDialogAction>
                <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
