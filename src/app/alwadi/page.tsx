'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, CreditCard, CheckCircle, History, Loader2, Wallet, SatelliteDish } from 'lucide-react';
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
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, increment, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function AlwadiPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [subscriberName, setSubscriberName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [selectedOption, setSelectedOption] = useState<RenewalOption | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [finalRemainingBalance, setFinalRemainingBalance] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isUserLoading } = useDoc<UserProfile>(userDocRef);

  const optionsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'alwadiOptions') : null),
    [firestore, user]
  );
  const { data: renewalOptions, isLoading: isOptionsLoading } = useCollection<RenewalOption>(optionsCollection);

  const sortedOptions = useMemo(() => {
    if (!renewalOptions) return [];
    return [...renewalOptions].sort((a, b) => a.price - b.price);
  }, [renewalOptions]);

  useEffect(() => {
    if (showSuccessOverlay && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [showSuccessOverlay]);

  const handleConfirmClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!subscriberName || !cardNumber) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال اسم المشترك ورقم الكرت",
      });
      return;
    }
    if (!selectedOption) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء اختيار فئة التجديد",
      });
      return;
    }
    if ((userProfile?.balance ?? 0) < selectedOption.price) {
      toast({
        variant: "destructive",
        title: "رصيد غير كاف",
        description: "رصيدك الحالي لا يكفي لإتمام هذه العملية.",
      });
      return;
    }
    setShowDialog(true);
  };

  const handleFinalConfirmation = async () => {
    if (!user || !firestore || !selectedOption || !userProfile || !userProfile.displayName || !userProfile.phoneNumber || !userDocRef) return;

    setIsProcessing(true);
    const numericPrice = selectedOption.price;
    const currentBalance = userProfile.balance ?? 0;

    const renewalRequestData = {
      userId: user.uid,
      userName: userProfile.displayName,
      userPhoneNumber: userProfile.phoneNumber,
      packageTitle: selectedOption.title,
      packagePrice: numericPrice,
      subscriberName: subscriberName,
      cardNumber: cardNumber,
      status: 'pending',
      requestTimestamp: new Date().toISOString(),
    };

    const batch = writeBatch(firestore);
    
    batch.update(userDocRef, {
      balance: increment(-numericPrice),
    });

    const renewalRequestsRef = collection(firestore, 'renewalRequests');
    const newRequestRef = doc(renewalRequestsRef);
    batch.set(newRequestRef, renewalRequestData);
    
    batch.commit().then(() => {
        setFinalRemainingBalance(currentBalance - numericPrice);
        setShowSuccessOverlay(true);
    }).catch(serverError => {
         const permissionError = new FirestorePermissionError({
            operation: 'write',
            path: `users/${user.uid} and renewalRequests/${newRequestRef.id}`,
            requestResourceData: { 
                balanceUpdate: `increment(${-numericPrice})`,
                renewalRequest: renewalRequestData 
            },
        });
        errorEmitter.emit('permission-error', permissionError);
        
        toast({
            variant: "destructive",
            title: "فشل إرسال الطلب",
            description: "حدث خطأ أثناء محاولة إرسال طلب التجديد. لم يتم خصم المبلغ.",
        });
    }).finally(() => {
        setIsProcessing(false);
        setShowDialog(false);
    });
  };

  if (isProcessing) {
    return <ProcessingOverlay message="جاري إرسال طلبك..." />;
  }

  if (showSuccessOverlay) {
    return (
      <>
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
          <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px]">
              <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center gap-4">
                      <div className="bg-green-100 p-4 rounded-full">
                          <CheckCircle className="h-16 w-16 text-green-600" />
                      </div>
                      <h2 className="text-xl font-bold">تم إرسال طلبك بنجاح</h2>
                      
                      <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2 text-right">
                         <div className="flex justify-between">
                              <span className="text-muted-foreground">الفئة:</span>
                              <span className="font-semibold">{selectedOption?.title}</span>
                          </div>
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">المبلغ:</span>
                              <span className="font-semibold text-primary">{selectedOption?.price.toLocaleString('en-US')} ريال</span>
                          </div>
                           <div className="flex justify-between">
                              <span className="text-muted-foreground">الرصيد المتبقي:</span>
                              <span className="font-semibold">{finalRemainingBalance.toLocaleString('en-US')} ريال</span>
                          </div>
                      </div>

                      <div className="w-full grid grid-cols-2 gap-3 pt-4">
                          <Button variant="outline" className="flex-1 rounded-2xl h-12" onClick={() => router.push('/login')}>الرئيسية</Button>
                          <Button className="flex-1 rounded-2xl h-12" onClick={() => router.push('/transactions')}>
                             <History className="ml-2 h-4 w-4" />
                             العمليات
                          </Button>
                      </div>
                  </div>
              </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="منظومة الوادي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="overflow-hidden rounded-2xl shadow-md bg-white flex items-center justify-center">
          <Image
            src="https://i.postimg.cc/mgMYL0dm/Screenshot-20260109-114041-One-Drive.png"
            alt="Alwadi Promotion"
            width={600}
            height={300}
            className="w-full h-auto object-contain max-h-40"
          />
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg">بيانات التجديد</CardTitle>
            <CardDescription className="text-center">أدخل بيانات الكرت واختر فئة التجديد</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subscriberName" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  اسم المشترك
                </Label>
                <Input
                  id="subscriberName"
                  placeholder="اسم المشترك"
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  رقم الكرت
                </Label>
                <Input
                  id="cardNumber"
                  inputMode="numeric"
                  placeholder="ادخل رقم الكرت"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <SatelliteDish className="h-4 w-4 text-primary" />
                اختر فئة التجديد
              </Label>
              {isOptionsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {sortedOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedOption(option)}
                      className={cn(
                        "relative p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center",
                        selectedOption?.id === option.id
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      {selectedOption?.id === option.id && (
                        <CheckCircle className="absolute top-1 right-1 h-4 w-4 text-primary" />
                      )}
                      <span className="text-xs font-bold">{option.title}</span>
                      <span className="text-sm font-black text-primary">{option.price.toLocaleString('en-US')} ريال</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedOption && (
              <div className="p-3 bg-muted rounded-xl flex items-center justify-between animate-in fade-in-0 slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-muted-foreground">الإجمالي:</span>
                </div>
                <span className="text-lg font-bold text-primary">{selectedOption.price.toLocaleString('en-US')} ريال يمني</span>
              </div>
            )}

            <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full h-12 text-lg font-bold rounded-xl" 
                  onClick={handleConfirmClick}
                  disabled={!selectedOption || !subscriberName || !cardNumber}
                >
                  تجديد الآن
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[32px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-center font-black">تأكيد معلومات التجديد</AlertDialogTitle>
                  <div className="space-y-4 pt-4 text-base text-foreground text-right">
                    <p className='text-sm text-center text-muted-foreground pb-2'>سيتم خصم المبلغ من رصيدك لإتمام العملية.</p>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">اسم المشترك:</span>
                      <span className="font-bold">{subscriberName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">رقم الكرت:</span>
                      <span className="font-bold">{cardNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-muted-foreground">الفئة:</span>
                      <span className="font-bold">{selectedOption?.title}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-muted-foreground">المبلغ:</span>
                      <span className="font-bold text-lg text-primary">{selectedOption?.price.toLocaleString('en-US')} ريال</span>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="grid grid-cols-2 gap-3 pt-4 sm:space-x-0">
                  <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                  <AlertDialogAction className="w-full rounded-2xl h-12 font-bold" onClick={handleFinalConfirmation}>
                    تأكيد وإرسال
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <a
          href="https://play.google.com/store/apps/details?id=com.app.dev.al_wadiapp"
          target="_blank"
          rel="noopener noreferrer"
          className="block py-4 text-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <p>لمعرفة صلاحية الفترة المتبقية في الكرت</p>
          <span className="underline font-semibold">اضغط هنا لتحميل تطبيق الوادي</span>
        </a>
      </div>
      <Toaster />
    </div>
  );
}
