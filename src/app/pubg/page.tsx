'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, User, CheckCircle, Gamepad2, Send } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
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
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

type PubgOffer = {
    offerName: string;
    offerId: string;
    price: number;
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

export default function PubgPage() {
  const [playerId, setPlayerId] = useState('');
  const [offers, setOffers] = useState<PubgOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<PubgOffer | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchOffers = async () => {
        setIsLoadingOffers(true);
        try {
            // Using a dummy player ID '1' to fetch the offers list as per some API designs
            const response = await fetch('/api/pubg?action=query&mobile=1');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch PUBG offers');
            }
            // Add price to offers, assuming it's in the name
            const offersWithPrice = data.offers.map((offer: any) => ({
                ...offer,
                price: parseInt(offer.offerName.match(/(\d+)/)?.[0] || '0', 10) * 2 // Example logic
            }));
            setOffers(data.offers);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ', description: `لا يمكن تحميل باقات ببجي حالياً. ${error.message}` });
        } finally {
            setIsLoadingOffers(false);
        }
    };
    fetchOffers();
  }, [toast]);
  
  const handlePurchase = async () => {
    if (!selectedOffer || !playerId || !userProfile || !firestore || !userDocRef || !user) {
        toast({ variant: 'destructive', title: "خطأ", description: "معلومات غير كافية لإتمام العملية." });
        setIsConfirming(false);
        return;
    }

    const totalCost = selectedOffer.price;

    if ((userProfile.balance ?? 0) < totalCost) {
        toast({ variant: "destructive", title: "رصيد غير كاف", description: `رصيدك الحالي لا يكفي لشراء هذه الباقة.` });
        setIsConfirming(false);
        return;
    }

    setIsProcessing(true);
    try {
        const response = await fetch(`/api/pubg?action=bill&mobile=${playerId}&amount=${selectedOffer.offerId}`);
        const data = await response.json();

        if (!response.ok || (data.resultCode && data.resultCode !== "0")) {
            throw new Error(data.message || data.resultDesc || 'فشل شحن الباقة لدى مزود الخدمة.');
        }

        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-totalCost) });
        
        const transactionData = {
          userId: user.uid,
          transactionDate: new Date().toISOString(),
          amount: totalCost,
          transactionType: `شحن ببجي: ${selectedOffer.offerName}`,
          notes: `للمعرف: ${playerId}`,
        };
        const transactionsCollection = collection(firestore, 'users', user.uid, 'transactions');
        batch.set(doc(transactionsCollection), transactionData);

        await batch.commit();
        setShowSuccess(true);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'فشل الشحن', description: error.message });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  }

  const renderOffers = () => {
    if (isLoadingOffers) {
        return <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
    }
    if (!offers.length) {
        return <p className="text-center text-muted-foreground py-8">لا توجد باقات متاحة حالياً.</p>
    }
    return (
        <div className="grid grid-cols-2 gap-4">
            {offers.map(offer => (
                <Card 
                    key={offer.offerId}
                    onClick={() => {
                        if(!playerId) {
                            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال معرف اللاعب أولاً.'})
                            return;
                        }
                        setSelectedOffer(offer)
                        setIsConfirming(true)
                    }}
                    className={cn(
                        "cursor-pointer hover:border-primary transition-colors text-center p-3 flex flex-col justify-center items-center gap-2",
                         selectedOffer?.offerId === offer.offerId && "border-primary bg-primary/10"
                    )}
                >
                    <Image src="https://i.postimg.cc/7ZZvJb3z/pubg-icon.png" width={40} height={40} alt="PUBG UC"/>
                    <p className="font-semibold text-sm">{offer.offerName}</p>
                    <p className="font-bold text-primary">{offer.price.toLocaleString('en-US')} ريال</p>
                </Card>
            ))}
        </div>
    )
  }

  if (showSuccess) {
    return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
        <Card className="w-full max-w-sm text-center shadow-2xl">
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold">تم الشحن بنجاح</h2>
                     <p className="text-sm text-muted-foreground">تم شحن حساب ببجي بنجاح.</p>
                    <div className="w-full space-y-3 text-sm bg-muted p-4 rounded-lg mt-2">
                       <div className="flex justify-between">
                            <span className="text-muted-foreground">معرف اللاعب:</span>
                            <span className="font-semibold">{playerId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">الباقة:</span>
                            <span className="font-semibold">{selectedOffer?.offerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">التكلفة:</span>
                            <span className="font-semibold text-destructive">{selectedOffer?.price.toLocaleString('en-US')} ريال</span>
                        </div>
                    </div>
                    <div className="w-full grid grid-cols-2 gap-3 pt-4">
                        <Button variant="outline" onClick={() => router.push('/')}>الرئيسية</Button>
                        <Button onClick={() => setShowSuccess(false)} variant="default">
                           شحن مرة أخرى
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
      <SimpleHeader title="شحن شدات ببجي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">1. أدخل معرف اللاعب (ID)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                id="playerId"
                type="number"
                placeholder="ادخل ID اللاعب هنا..."
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value.replace(/\D/g, ''))}
                className="text-lg text-center h-14 tracking-wider"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-center">2. اختر باقة الشحن</CardTitle>
            </CardHeader>
            <CardContent>
                {renderOffers()}
            </CardContent>
        </Card>

      </div>
    </div>
    <Toaster />
    
     <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            {selectedOffer && (
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد العملية</AlertDialogTitle>
                        <AlertDialogDescription>
                        هل تريد بالتأكيد شحن باقة "{selectedOffer.offerName}" للمعرف ({playerId})؟
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2 text-sm">
                        <div className="flex justify-between font-bold text-base">
                            <span className="text-primary">التكلفة الإجمالية:</span>
                            <span className="text-primary">{selectedOffer.price.toLocaleString('en-US')} ريال</span>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurchase} disabled={isProcessing}>
                            {isProcessing ? 'جاري التنفيذ...' : 'تأكيد'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            )}
    </AlertDialog>
    </>
  );
}
