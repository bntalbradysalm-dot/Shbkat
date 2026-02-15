'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, CheckCircle, History, Loader2, Wallet, SatelliteDish, Calendar, Hash, Search, AlertCircle, X, CreditCard, Phone } from 'lucide-react';
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

type RemoteSubscriber = {
    id: number;
    name_subscriber: string;
    mobile: string;
    num_card?: string;
    expiry_date?: string;
};

export default function AlwadiPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [searchNumber, setSearchNumber] = useState('');
  const [searchResults, setSearchResults] = useState<RemoteSubscriber[]>([]);
  const [isSearchingSub, setIsSearchingSub] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<RemoteSubscriber | null>(null);
  
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

  // جلب الفئات من الـ API الجديد
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
    setSelectedSubscriber(null);
    setSearchResults([]);
    
    try {
      const response = await fetch('/api/alwadi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', payload: { number: searchNumber } })
      });
      
      if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'فشل البحث');
      }

      const result = await response.json();
      
      if (result && result.records && Array.isArray(result.records)) {
          setSearchResults(result.records);
          if (result.records.length === 0) {
              toast({ title: "لا توجد نتائج", description: "لم يتم العثور على مشترك بهذا الرقم." });
          }
      } else {
          setSearchResults([]);
      }
    } catch (e: any) {
      console.error("Search error:", e);
      toast({ variant: "destructive", title: "خطأ في البحث", description: e.message });
      setSearchResults([]);
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
    if (!selectedSubscriber) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء البحث واختيار المشترك" });
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
    if (!user || !firestore || !selectedOption || !userProfile || !userDocRef || !selectedSubscriber) return;

    setIsProcessing(true);
    const numericPrice = selectedOption.price;
    const txId = Math.random().toString(36).substring(2, 10).toUpperCase();
    setLastTxId(txId);

    try {
        const response = await fetch('/api/alwadi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'renew', 
                payload: { 
                    subscriberId: selectedSubscriber.id,
                    categoryId: parseInt(selectedOption.id),
                    mobile: selectedSubscriber.mobile,
                    price: numericPrice
                } 
            })
        });

        const apiResult = await response.json();

        if (!response.ok) {
            throw new Error(apiResult.message || 'فشل التجديد من المنظومة الأساسية');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-numericPrice) });

        const renewalRequestData = {
            userId: user.uid,
            userName: userProfile.displayName,
            userPhoneNumber: userProfile.phoneNumber,
            packageTitle: selectedOption.title,
            packagePrice: numericPrice,
            subscriberName: selectedSubscriber.name_subscriber,
            subscriberId: selectedSubscriber.id,
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
            transactionType: `تجديد آلي: ${selectedOption.title}`,
            notes: `للمشترك: ${selectedSubscriber.name_subscriber}`,
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

  if (isProcessing) return <ProcessingOverlay message="جاري تنفيذ التجديد في المنظومة..." />;

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
                    <p className="text-sm text-muted-foreground mt-1">تم تفعيل الاشتراك في نظام الوادي</p>
                  </div>
                  
                  <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                          <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم العملية:</span>
                          <span className="font-mono font-black text-primary">{lastTxId}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                          <span className="text-muted-foreground flex items-center gap-2"><User className="w-3.5 h-3.5" /> المشترك:</span>
                          <span className="font-bold truncate max-w-[150px]">{selectedSubscriber?.name_subscriber}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-muted pb-2">
                          <span className="text-muted-foreground flex items-center gap-2"><SatelliteDish className="w-3.5 h-3.5" /> باقة التجديد:</span>
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
        <div className="overflow-hidden rounded-2xl shadow-md bg-white flex items-center justify-center">
          <Image src="https://i.postimg.cc/mgMYL0dm/Screenshot-20260109-114041-One-Drive.png" alt="Alwadi" width={600} height={300} className="w-full h-auto object-contain max-h-40" />
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">بحث المشترك</CardTitle>
            <CardDescription className="text-center">أدخل رقم الجوال المسجل في المنظومة للتحقق من الهوية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="subscriberNumber" className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />رقم الجوال</Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            id="subscriberNumber"
                            placeholder="مثال: 77xxxxxxx"
                            value={searchNumber}
                            onChange={(e) => {
                                setSearchNumber(e.target.value);
                                if (selectedSubscriber) {
                                    setSelectedSubscriber(null);
                                    setSearchResults([]);
                                }
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

                {searchResults.length > 0 && !selectedSubscriber && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in-0 slide-in-from-top-2">
                        {searchResults.map((sub) => (
                            <div 
                                key={sub.id} 
                                onClick={() => setSelectedSubscriber(sub)} 
                                className="p-3 border-b last:border-none hover:bg-primary/5 cursor-pointer flex justify-between items-center transition-colors"
                            >
                                <div className='flex flex-col'>
                                    <span className="text-sm font-bold text-foreground">{sub.name_subscriber}</span>
                                    <span className="text-[10px] text-muted-foreground">رقم الكرت: {sub.num_card || 'غير متوفر'}</span>
                                </div>
                                <CheckCircle className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                            </div>
                        ))}
                    </div>
                )}
              </div>
            </div>

            {selectedSubscriber && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in zoom-in-95 space-y-3">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-primary uppercase">المشترك المختار:</p>
                            <p className="text-sm font-black text-foreground">{selectedSubscriber.name_subscriber}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedSubscriber(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-primary/10">
                        <div className="flex items-center gap-2"><CreditCard className="w-3 h-3 text-muted-foreground"/> <span>كرت: {selectedSubscriber.num_card}</span></div>
                        <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-muted-foreground"/> <span>انتهاء: {selectedSubscriber.expiry_date}</span></div>
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

            {selectedOption && (
              <div className="p-3 bg-muted rounded-xl flex items-center justify-between animate-in fade-in-0 slide-in-from-top-2">
                <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /><span className="text-sm font-semibold text-muted-foreground">الإجمالي:</span></div>
                <span className="text-lg font-bold text-primary">{selectedOption.price.toLocaleString('en-US')} ريال</span>
              </div>
            )}

            <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
              <Button 
                className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg" 
                onClick={handleConfirmClick} 
                disabled={!selectedOption || !selectedSubscriber}
              >
                تجديد آلي الآن
              </Button>
              <AlertDialogContent className="rounded-[32px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-center font-black">تأكيد معلومات التجديد</AlertDialogTitle>
                  <div className="space-y-4 pt-4 text-base text-foreground text-right">
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-muted-foreground">اسم المشترك:</span><span className="font-bold truncate max-w-[180px]">{selectedSubscriber?.name_subscriber}</span></div>
                    <div className="flex justify-between items-center py-2 border-b"><span className="text-muted-foreground">رقم الجوال:</span><span className="font-mono font-bold text-primary">{selectedSubscriber?.mobile}</span></div>
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
                <li>عملية التجديد آلية وغير قابلة للتراجع بعد الخصم من رصيدك.</li>
                <li>يرجى التحقق من بيانات المشترك الظاهرة قبل الضغط على تنفيذ.</li>
            </ul>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
