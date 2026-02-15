'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, CheckCircle, History, Loader2, Wallet, SatelliteDish, Calendar, Hash, Search, AlertCircle, X, CreditCard, Smartphone } from 'lucide-react';
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
import { collection, doc, increment, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type RenewalOption = {
  id: string; 
  title: string;
  price: number;
};

type UserProfile = {
  balance?: number;
  phoneNumber?: string;
  displayName?: string;
};

type CardDetails = {
    num_card: string;
    expiry_date: string;
    subscriber_name?: string;
    mobile?: string;
};

export default function AlwadiPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [searchNumber, setSearchNumber] = useState('');
  const [cardInfo, setCardInfo] = useState<CardDetails | null>(null);
  const [isSearchingSub, setIsSearchingSub] = useState(false);
  
  const [renewalOptions, setRenewalOptions] = useState<RenewalOption[]>([]);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<RenewalOption | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [lastTxId, setLastTxId] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  // جلب الفئات الرسمية المحدثة
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const result = await response.json();
        if (result.success) {
          const mapped = result.data.map((c: any) => ({
            id: String(c.id),
            title: c.name,
            price: c.price
          }));
          setRenewalOptions(mapped);
        }
      } catch (e) {
        console.error("Failed to fetch categories:", e);
      } finally {
        setIsOptionsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const sortedOptions = useMemo(() => {
    return [...renewalOptions].sort((a, b) => a.price - b.price);
  }, [renewalOptions]);

  const handleSearch = async () => {
    if (!searchNumber) return;

    setIsSearchingSub(true);
    setCardInfo(null);
    
    try {
      const response = await fetch('/api/alwadi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', payload: { number: searchNumber } })
      });
      
      const result = await response.json();

      if (!response.ok) {
          throw new Error(result.message || 'فشل البحث');
      }

      // معالجة رد onchange
      if (result && result.value) {
          const val = result.value;
          setCardInfo({
              num_card: searchNumber,
              expiry_date: val.expiry_date || 'غير متوفر',
              subscriber_name: val.subscriber_name || 'مشترك غير معروف',
              mobile: val.mobile || ''
          });
      } else {
          toast({ title: "لا توجد بيانات", description: "لم يتم العثور على معلومات لهذا الكرت." });
      }
    } catch (e: any) {
      console.error("Search error:", e);
      toast({ variant: "destructive", title: "خطأ في البحث", description: e.message });
    } finally {
      setIsSearchingSub(false);
    }
  };

  useEffect(() => {
    if (showSuccessOverlay && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [showSuccessOverlay]);

  const handleConfirmClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!cardInfo) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء البحث عن الكرت أولاً" });
      return;
    }
    if (!selectedOption) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار فئة التجديد" });
      return;
    }
    if ((userProfile?.balance ?? 0) < selectedOption.price) {
      toast({ variant: "destructive", title: "رصيد غير كاف", description: "رصيدك الحالي لا يكفي لإتمام هذه العملية." });
      return;
    }
    setShowDialog(true);
  };

  const handleFinalConfirmation = async () => {
    if (!user || !firestore || !selectedOption || !userProfile || !userDocRef || !cardInfo) return;

    setIsProcessing(true);
    const numericPrice = selectedOption.price;

    try {
        const response = await fetch('/api/alwadi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'renew', 
                payload: { 
                    num_card: cardInfo.num_card,
                    expiry_date: cardInfo.expiry_date,
                    categoryId: parseInt(selectedOption.id),
                    mobile: cardInfo.mobile || userProfile.phoneNumber,
                    price: numericPrice
                } 
            })
        });

        const apiResult = await response.json();

        if (!response.ok) {
            throw new Error(apiResult.message || 'فشل التجديد من المنظومة الأساسية');
        }

        // تسجيل العملية في Firebase
        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-numericPrice) });

        const txId = `RP${Date.now().toString().slice(-6)}`;
        setLastTxId(txId);

        const renewalRequestData = {
            userId: user.uid,
            userName: userProfile.displayName,
            packageTitle: selectedOption.title,
            packagePrice: numericPrice,
            cardNumber: cardInfo.num_card,
            status: 'approved',
            requestTimestamp: new Date().toISOString(),
            transid: txId,
            remoteResult: apiResult
        };

        batch.set(doc(collection(firestore, 'renewalRequests')), renewalRequestData);
        batch.set(doc(collection(firestore, 'users', user.uid, 'transactions')), {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: numericPrice,
            transactionType: `تجديد الوادي: ${selectedOption.title}`,
            notes: `كرت رقم: ${cardInfo.num_card}`,
            transid: txId
        });
        
        await batch.commit();
        setShowSuccessOverlay(true);

    } catch (e: any) {
        toast({ variant: "destructive", title: "فشل تنفيذ الطلب", description: e.message });
    } finally {
        setIsProcessing(false);
        setShowDialog(false);
    }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ التجديد..." />;

  if (showSuccessOverlay) {
    return (
      <>
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
          <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
              <div className="bg-green-500 p-8 flex justify-center items-center">
                  <div className="bg-white/20 p-4 rounded-full animate-bounce"><CheckCircle className="h-16 w-16 text-white" /></div>
              </div>
              <CardContent className="p-8 space-y-6">
                  <div>
                    <h2 className="text-2xl font-black text-green-600">تم التجديد بنجاح</h2>
                    <p className="text-sm text-muted-foreground mt-1">تم إرسال الطلب للمنظومة بنجاح</p>
                  </div>
                  
                  <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                          <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم العملية:</span>
                          <span className="font-mono font-black text-primary">{lastTxId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                          <span className="text-muted-foreground flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> رقم الكرت:</span>
                          <span className="font-bold">{cardInfo?.num_card}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                          <span className="text-muted-foreground flex items-center gap-2"><SatelliteDish className="w-3.5 h-3.5" /> الباقة:</span>
                          <span className="font-bold">{selectedOption?.title}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                          <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> المبلغ المخصوم:</span>
                          <span className="font-black text-primary">{selectedOption?.price.toLocaleString('en-US')} ريال</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                          <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> التاريخ:</span>
                          <span className="text-[10px] font-bold">{format(new Date(), 'Pp', { locale: ar })}</span>
                      </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-3 pt-2">
                      <Button variant="outline" className="flex-1 rounded-2xl h-12 font-bold" onClick={() => router.push('/login')}>الرئيسية</Button>
                      <Button className="flex-1 rounded-2xl h-12 font-bold" onClick={() => router.push('/transactions')}><History className="ml-2 h-4 w-4" />العمليات</Button>
                  </div>
              </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="منظومة الوادي (تجديد آلي)" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="overflow-hidden rounded-2xl shadow-md bg-white flex items-center justify-center p-2">
          <Image src="https://i.postimg.cc/mgMYL0dm/Screenshot-20260109-114041-One-Drive.png" alt="Alwadi" width={600} height={300} className="w-full h-auto object-contain max-h-40" />
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">التحقق من الكرت</CardTitle>
            <CardDescription className="text-center">أدخل رقم الكرت لجلب بيانات الانتهاء والمشترك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="cardNumber" className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />رقم الكرت</Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            id="cardNumber"
                            placeholder="ادخل رقم الكرت هنا"
                            value={searchNumber}
                            onChange={(e) => {
                                setSearchNumber(e.target.value);
                                if (cardInfo) setCardInfo(null);
                            }}
                            className="rounded-xl pr-10 font-bold h-12"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                    <Button 
                        onClick={handleSearch} 
                        disabled={isSearchingSub || !searchNumber}
                        className="rounded-xl h-12 w-12 p-0"
                    >
                        {isSearchingSub ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    </Button>
                </div>
              </div>
            </div>

            {cardInfo && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in zoom-in-95 space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase">بيانات المشترك:</p>
                            <p className="text-sm font-black text-foreground">{cardInfo.subscriber_name}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCardInfo(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-primary/10">
                        <div className="flex items-center gap-2"><Hash className="w-3 h-3 text-muted-foreground"/> <span>الكرت: {cardInfo.num_card}</span></div>
                        <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-muted-foreground"/> <span>انتهاء: {cardInfo.expiry_date}</span></div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
              <Label className="flex items-center gap-2"><SatelliteDish className="h-4 w-4 text-primary" />اختر فئة التجديد</Label>
              {isOptionsLoading ? (
                <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {sortedOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedOption(option)}
                      className={cn(
                        "relative p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center",
                        selectedOption?.id === option.id ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/30"
                      )}
                    >
                      {selectedOption?.id === option.id && <CheckCircle className="absolute top-1 right-1 h-4 w-4 text-primary" />}
                      <span className="text-xs font-bold">{option.title}</span>
                      <span className="text-sm font-black text-primary">{option.price.toLocaleString('en-US')} ريال</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
              <Button 
                className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg" 
                onClick={handleConfirmClick} 
                disabled={!selectedOption || !cardInfo}
              >
                تجديد آلي الآن
              </Button>
              <AlertDialogContent className="rounded-[32px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-center font-black">تأكيد معلومات التجديد</AlertDialogTitle>
                  <div className="space-y-4 pt-4 text-base text-foreground text-right">
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-muted-foreground">رقم الكرت:</span><span className="font-mono font-bold text-primary">{cardInfo?.num_card}</span></div>
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-muted-foreground">الفئة المختارة:</span><span className="font-bold">{selectedOption?.title}</span></div>
                    <div className="flex justify-between items-center py-2"><span className="text-muted-foreground">المبلغ المخصوم:</span><span className="font-bold text-lg text-primary">{selectedOption?.price.toLocaleString('en-US')} ريال</span></div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="grid grid-cols-2 gap-3 pt-4 sm:space-x-0">
                  <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                  <AlertDialogAction className="w-full rounded-2xl h-12 font-bold" onClick={handleFinalConfirmation}>تأكيد وتنفيذ</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2 pb-10">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2"><AlertCircle className="w-3 h-3"/> تنبيهات هامة</h4>
            <ul className="text-[10px] text-muted-foreground space-y-1 pr-4 list-disc">
                <li>عملية التجديد تتم عبر نظام JSON-RPC المباشر وهي غير قابلة للتراجع.</li>
                <li>يتم استقطاع المبلغ من محفظتك فور نجاح العملية في المنظومة.</li>
            </ul>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
