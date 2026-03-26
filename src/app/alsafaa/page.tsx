
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
  LayoutGrid,
  Star,
  Clock,
  Search,
  Loader2,
  User,
  Zap,
  Package,
  CalendarDays,
  AlertCircle
} from 'lucide-react';
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

const ALSAFAA_LOGO = "https://i.postimg.cc/90nZ85Kk/20260324-221446.jpg";
const ALSAFAA_ICON = "https://i.postimg.cc/HWc1sG9N/20260324-231520.png";

type SafaaPackage = {
    cardid: string;
    subid: string;
    clientname: string;
    expires: string;
    expiry: string;
    package: string;
    planid: string;
    price: number;
    timeplan: string;
    duration: string;
};

// فئات افتراضية تظهر قبل الاستعلام
const PRE_FETCHED_PACKAGES = [
    { subid: 'default_base', package: 'الباقة الأساسية', price: 5000, timeplan: 'تجديد 3 أشهر', isDefault: true },
    { subid: 'default_plus', package: 'برايمر بلص', price: 1000, timeplan: 'تجديد 3 أشهر', isDefault: true },
];

export default function AlsafaaPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [isInquiring, setIsInquiring] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<SafaaPackage[] | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  
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
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (showSuccess && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  }, [showSuccess]);

  const handleInquiry = async () => {
    if (!cardNumber) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال رقم الكرت أولاً." });
      return;
    }

    // تجربة رقم 0 للعرض التجريبي
    if (cardNumber === '0') {
        setIsInquiring(true);
        setTimeout(() => {
            const demoData: SafaaPackage[] = [
                {
                    cardid: '0',
                    subid: '105283',
                    clientname: 'مستشار تجريبي - الصفاء',
                    expires: '31/12/2025',
                    expiry: 'صالحة لغاية 2025-12-31',
                    package: 'الباقة الأساسية',
                    planid: '27',
                    price: 5000,
                    timeplan: 'تجديد 3 أشهر',
                    duration: '3'
                },
                {
                    cardid: '0',
                    subid: '105284',
                    clientname: 'مستشار تجريبي - الصفاء',
                    expires: '31/12/2025',
                    expiry: 'صالحة لغاية 2025-12-31',
                    package: 'برايمر بلص',
                    planid: '12',
                    price: 1000,
                    timeplan: 'تجديد 3 أشهر',
                    duration: '3'
                }
            ];
            setInquiryResult(demoData);
            setIsInquiring(false);
        }, 800);
        return;
    }

    setIsInquiring(true);
    setInquiryResult(null);
    setSelectedPkg(null);

    try {
        const res = await fetch('/api/alsafaa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'info', payload: { cardNumber } })
        });
        const result = await res.json();

        if (result.success) {
            setInquiryResult(result.data);
            if (result.data.length === 1) {
                setSelectedPkg(result.data[0]);
            }
        } else {
            toast({ variant: "destructive", title: "تنبيه من النظام", description: result.message || "فشل الاتصال بالنظام." });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل الاتصال بسيرفر الشبكة." });
    } finally {
        setIsInquiring(false);
    }
  };

  const handleRenewClick = () => {
    if (!selectedPkg) {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار الباقة المراد تجديدها." });
      return;
    }
    if (!cardNumber) {
        toast({ variant: "destructive", title: "تنبيه", description: "الرجاء إدخال رقم الكرت أولاً." });
        return;
    }
    if ((userProfile?.balance ?? 0) < selectedPkg.price) {
      toast({ variant: "destructive", title: "رصيد غير كافٍ", description: "رصيدك الحالي لا يكفي لإتمام هذه العملية." });
      return;
    }
    
    // إذا كانت باقة افتراضية، يجب التأكد من عمل استعلام أولاً
    if (selectedPkg.isDefault && cardNumber !== '0') {
        toast({ variant: "destructive", title: "تنبيه", description: "الرجاء الضغط على زر الاستعلام أولاً للتحقق من بيانات الكرت قبل التجديد." });
        return;
    }

    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    if (!user || !firestore || !selectedPkg || !userProfile || !userDocRef) return;

    setIsProcessing(true);
    setIsConfirming(false);

    try {
      // تنفيذ التجديد في API الشبكة (تخطي للرقم التجريبي 0)
      if (cardNumber !== '0') {
          const res = await fetch('/api/alsafaa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  action: 'recharge', 
                  payload: { cardNumber: cardNumber, subid: selectedPkg.subid } 
              })
          });
          const result = await res.json();

          if (!result.success) {
              throw new Error(result.message);
          }
      }

      // تحديث الرصيد وتسجيل العملية في Firebase
      const batch = writeBatch(firestore);
      const now = new Date().toISOString();
      const currentBalance = userProfile.balance ?? 0;

      batch.update(userDocRef, { balance: increment(-selectedPkg.price) });
      
      const txRef = doc(collection(firestore, 'users', user.uid, 'transactions'));
      batch.set(txRef, {
        userId: user.uid,
        transactionDate: now,
        amount: selectedPkg.price,
        transactionType: `تجديد باقة شبكة الصفاء الرقمية`,
        notes: `باقة: ${selectedPkg.package} - رقم الكرت: ${cardNumber}`,
        cardNumber: cardNumber
      });

      await batch.commit();
      
      setFinalRemainingBalance(currentBalance - selectedPkg.price);
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

  const calculateDaysLeft = (dateStr: string) => {
      if (!dateStr) return 0;
      try {
          const parts = dateStr.split('/');
          if (parts.length !== 3) return 0;
          const expiry = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          const now = new Date();
          const diffTime = expiry.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays > 0 ? diffDays : 0;
      } catch (e) { return 0; }
  };

  if (!isMounted) return null;

  if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ التجديد..." />;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 zoom-in-95 duration-500">
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
        
        <Card className="w-full max-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
            <div className="bg-green-500 p-8 flex justify-center">
                <div className="bg-white/20 p-4 rounded-full animate-bounce">
                    <CheckCircle className="h-16 w-16 text-white" />
                </div>
            </div>
            <CardContent className="p-8 space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-green-600">تم التجديد بنجاح</h2>
                    <p className="text-sm text-muted-foreground mt-1">شبكة الصفاء الرقمية - نظام السداد المباشر</p>
                </div>

                <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><Package className="w-3.5 h-3.5" /> الباقة:</span>
                        <span className="font-bold">{selectedPkg?.package}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> رقم الكرت:</span>
                        <span className="font-mono font-bold">{cardNumber}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-muted pb-2">
                        <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> المبلغ المخصوم:</span>
                        <span className="font-black text-primary">{selectedPkg?.price.toLocaleString('en-US')} ريال</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">الرصيد المتبقي:</span>
                        <span className="font-bold">{(userProfile?.balance ?? 0).toLocaleString('en-US')} ريال</span>
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

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
      <SimpleHeader title="شبكة الصفاء الرقمية" />
      <div className="flex-1 overflow-y-auto">
        
        <div className="bg-mesh-gradient pt-8 pb-12 px-6 rounded-b-[50px] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col items-center text-center space-y-4">
                <div className="bg-white p-1 rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-700 overflow-hidden border-2 border-white">
                    <div className="relative h-24 w-56 rounded-[20px] overflow-hidden">
                        <Image src={ALSAFAA_LOGO} alt="Alsafaa Logo" fill className="object-contain" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white tracking-tight">تجديد باقات الصفاء الرقمية</h2>
                    <div className="flex items-center justify-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-[10px] text-white/80 font-bold uppercase tracking-[0.2em]">نظام التفعيل المباشر (API)</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="px-4 mt-6 space-y-8 pb-10">
            <Card className="rounded-[32px] border-none shadow-sm bg-card overflow-hidden">
                <CardContent className="p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cardNumber" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">رقم الكرت المراد تجديده</Label>
                            <div className="relative">
                                <Input
                                    id="cardNumber"
                                    type="tel"
                                    placeholder="ادخل رقم الكرت"
                                    value={cardNumber}
                                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                    className="h-12 rounded-2xl bg-muted/10 border-2 border-primary/20 focus-visible:ring-primary pr-11 font-black text-lg text-right"
                                />
                                <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-60" />
                            </div>
                        </div>
                        <Button 
                            className="w-full h-11 rounded-2xl font-black bg-mesh-gradient text-white shadow-lg active:scale-95 transition-all border-none"
                            onClick={handleInquiry}
                            disabled={isInquiring || !cardNumber}
                        >
                            {isInquiring ? <Loader2 className="animate-spin h-4 w-4 ml-2" /> : <Search className="h-4 w-4 ml-2" />}
                            استعلام عن الكرت
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {inquiryResult && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                    <Card className="rounded-[32px] border-none shadow-md bg-white dark:bg-slate-900 overflow-hidden">
                        <CardHeader className="bg-mesh-gradient pb-4">
                            <CardTitle className="text-xs font-black text-white uppercase text-center flex items-center justify-center gap-2">
                                <User className="h-4 w-4 text-white" /> معلومات المشترك
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-muted-foreground mb-1">اسم العميل</p>
                                <h3 className="text-lg font-black text-foreground">{inquiryResult[0].clientname}</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="bg-muted/30 p-3 rounded-2xl text-center border border-muted">
                                    <p className="text-[9px] font-bold text-muted-foreground mb-1">تاريخ الانتهاء</p>
                                    <p className="text-xs font-black text-foreground">{inquiryResult[0].expires}</p>
                                </div>
                                <div className="bg-muted/30 p-3 rounded-2xl text-center border border-muted">
                                    <p className="text-[9px] font-bold text-muted-foreground mb-1">رقم الكرت</p>
                                    <p className="text-xs font-black text-primary">{cardNumber}</p>
                                </div>
                            </div>

                            {(() => {
                                const days = calculateDaysLeft(inquiryResult[0].expires);
                                const isCritical = days <= 9;
                                return (
                                    <div className={cn(
                                        "p-3 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all duration-500",
                                        isCritical 
                                            ? "bg-red-500/10 border-red-500/20 text-red-600" 
                                            : "bg-green-500/10 border-green-500/20 text-green-600"
                                    )}>
                                        <p className="text-[9px] font-bold opacity-80 uppercase text-center">المدة المتبقية لصلاحية الكرت</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black">
                                                {days} {days <= 10 && days > 0 ? 'أيام' : 'يوم'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                        فئات التجديد المتاحة
                    </h3>
                    <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2 border border-primary/5">
                        <Wallet className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-black text-primary">{(userProfile?.balance ?? 0).toLocaleString('en-US')} ر.ي</span>
                    </div>
                </div>

                <div className="grid gap-3">
                    {(inquiryResult || PRE_FETCHED_PACKAGES).map((pkg: any) => (
                        <button
                            key={pkg.subid}
                            onClick={() => setSelectedPkg(pkg)}
                            className={cn(
                                "p-4 rounded-3xl border-2 transition-all duration-300 flex items-center justify-between text-right gap-3 overflow-hidden shadow-sm active:scale-[0.98]",
                                selectedPkg?.subid === pkg.subid 
                                    ? "border-primary bg-primary/5" 
                                    : "bg-white dark:bg-slate-900 border-transparent"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-2xl bg-white shadow-sm border w-12 h-12 flex items-center justify-center shrink-0">
                                    <div className="relative w-full h-full">
                                        <Image src={ALSAFAA_ICON} alt={pkg.package} fill className="object-contain" />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black block text-foreground">{pkg.package}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge className="bg-muted text-muted-foreground text-[8px] font-black h-4 px-1.5 border-none">
                                            {pkg.timeplan}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-black text-primary">{pkg.price.toLocaleString('en-US')} <span className="text-[10px]">ر.ي</span></p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-2">
                <Button 
                    className="w-full h-14 rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-transform"
                    onClick={handleRenewClick}
                    disabled={!selectedPkg}
                >
                    تجديد الباقة المختارة
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
                        <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="w-3 h-3"/> رقم الكرت:</span>
                        <span className="font-mono font-bold">{cardNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><Star className="w-3 h-3"/> نوع الباقة:</span>
                        <span className="font-bold">{selectedPkg?.package}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-3 h-3"/> مدة التجديد:</span>
                        <span className="font-bold">{selectedPkg?.timeplan}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-muted/50 rounded-2xl px-3 mt-2">
                        <span className="font-black">المبلغ المخصوم:</span>
                        <span className="font-black text-primary text-xl">{selectedPkg?.price.toLocaleString('en-US')} ريال</span>
                    </div>
                </div>
            </AlertDialogHeader>
            <AlertDialogFooter className="grid grid-cols-2 gap-3 sm:space-x-0">
                <AlertDialogAction onClick={handleFinalSubmit} className="w-full rounded-2xl h-12 font-bold shadow-lg">
                    تأكيد
                </AlertDialogAction>
                <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
