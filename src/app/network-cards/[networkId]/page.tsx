'use client';

import React, { useEffect, useState, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection, query, where, getDocs, limit as firestoreLimit, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle, Copy, AlertCircle, Database, CreditCard, MessageSquare, Smartphone, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Separator } from '@/components/ui/separator';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type CardCategory = {
    id: string;
    name: string;
    price: number;
    capacity?: string;
    validity?: string;
};

type NetworkCard = {
    id: string;
    cardNumber: string;
    status: 'available' | 'sold';
    categoryId: string;
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

type Network = {
    ownerId: string;
    name: string;
};


function NetworkPurchasePageComponent() {
  const params = useParams();
  const networkId = params.networkId as string;
  const searchParams = useSearchParams();
  
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const networkDocRef = useMemoFirebase(() => (firestore && networkId ? doc(firestore, 'networks', networkId) : null), [firestore, networkId]);
  const { data: networkData } = useDoc<Network>(networkDocRef);
  const networkName = networkData?.name || searchParams.get('name') || 'شراء كروت';

  const categoriesQuery = useMemoFirebase(() => (
    firestore && networkId ? collection(firestore, `networks/${networkId}/cardCategories`) : null
  ), [firestore, networkId]);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<CardCategory>(categoriesQuery);

  const [selectedCategory, setSelectedCategory] = useState<CardCategory | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<NetworkCard | null>(null);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (purchasedCard && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  }, [purchasedCard]);
  
  const handlePurchase = async () => {
    if (!selectedCategory || !user || !userProfile || !firestore || !userDocRef || !userProfile.displayName || !userProfile.phoneNumber || !networkId || !networkData) {
      toast({
        variant: "destructive",
        title: "خطأ في البيانات",
        description: "معلومات المستخدم أو الشبكة غير مكتملة. لا يمكن إتمام الشراء.",
      });
      setIsConfirming(false);
      return;
    }
  
    if (user.uid === networkData.ownerId) {
      toast({
        variant: "destructive",
        title: "غير مسموح",
        description: "لا يمكنك شراء كرت من شبكتك الخاصة.",
      });
      setIsConfirming(false);
      return;
    }
  
    setIsProcessing(true);
    const categoryPrice = selectedCategory.price;
    const userBalance = userProfile?.balance ?? 0;
  
    if (userBalance < categoryPrice) {
        toast({
            variant: "destructive",
            title: "رصيد غير كافٍ",
            description: "رصيدك الحالي لا يكفي لإتمام عملية الشراء.",
        });
        setIsProcessing(false);
        setIsConfirming(false);
        return;
    }
  
    try {
        const cardsRef = collection(firestore, `networks/${networkId}/cards`);
        const q = query(cardsRef, where('categoryId', '==', selectedCategory.id), where('status', '==', 'available'), firestoreLimit(1));
        const availableCardsSnapshot = await getDocs(q);
  
        if (availableCardsSnapshot.empty) {
            throw new Error('لا توجد كروت متاحة في هذه الفئة حالياً.');
        }
  
        const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
        const cardToPurchaseData = { id: cardToPurchaseDoc.id, ...cardToPurchaseDoc.data() } as NetworkCard;
        
        const ownerId = networkData.ownerId;
        const ownerDocRef = doc(firestore, 'users', ownerId);
  
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();
        const commission = categoryPrice * 0.10;
        const payoutAmount = categoryPrice - commission;
  
        batch.update(cardToPurchaseDoc.ref, {
            status: 'sold',
            soldTo: user.uid,
            soldTimestamp: now,
        });
        
        batch.update(userDocRef, { balance: increment(-categoryPrice) });
        batch.update(ownerDocRef, { balance: increment(payoutAmount) });
  
        const buyerTransactionRef = doc(collection(firestore, `users/${user.uid}/transactions`));
        batch.set(buyerTransactionRef, {
            userId: user.uid,
            transactionDate: now,
            amount: categoryPrice,
            transactionType: `شراء كرت ${selectedCategory.name}`,
            notes: `شبكة: ${networkName}`,
            cardNumber: cardToPurchaseData.cardNumber,
        });

        const ownerTransactionRef = doc(collection(firestore, `users/${ownerId}/transactions`));
        batch.set(ownerTransactionRef, {
            userId: ownerId,
            transactionDate: now,
            amount: payoutAmount,
            transactionType: 'أرباح بيع كرت',
            notes: `بيع كرت ${selectedCategory.name} للمشتري ${userProfile.displayName}`,
        });

        const soldCardRef = doc(collection(firestore, 'soldCards'));
        batch.set(soldCardRef, {
            networkId: networkId,
            ownerId: ownerId,
            networkName: networkName,
            categoryId: selectedCategory.id,
            categoryName: selectedCategory.name,
            cardId: cardToPurchaseData.id,
            cardNumber: cardToPurchaseData.cardNumber,
            price: categoryPrice,
            commissionAmount: commission,
            payoutAmount: payoutAmount,
            buyerId: user.uid,
            buyerName: userProfile.displayName,
            buyerPhoneNumber: userProfile.phoneNumber,
            soldTimestamp: now,
            payoutStatus: 'completed'
        });
        
        await batch.commit();
        setPurchasedCard(cardToPurchaseData);
  
    } catch (error: any) {
        console.error("Purchase failed:", error);
        toast({
            variant: "destructive",
            title: "فشل عملية الشراء",
            description: error.message || "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  const handleCopyCardDetails = () => {
    if (purchasedCard) {
        navigator.clipboard.writeText(purchasedCard.cardNumber);
        toast({
            title: "تم النسخ",
            description: "تم نسخ رقم الكرت بنجاح.",
        });
    }
  };
  
  const handleSendSms = () => {
    if (!purchasedCard || !selectedCategory || !smsRecipient || !networkName) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: "الرجاء إدخال رقم زبون صحيح."
        });
        return;
    }

    const messageBody = `شبكة: ${networkName}\nفئة: ${selectedCategory.name}\nرقم الكرت: ${purchasedCard.cardNumber}`;
    const smsUri = `sms:${smsRecipient}?body=${encodeURIComponent(messageBody)}`;
    window.location.href = smsUri;
    setIsSmsDialogOpen(false);
  };

  if (isProcessing) {
    return <ProcessingOverlay message="جاري تجهيز الكرت..." />;
  }

  if (purchasedCard) {
    return (
      <>
        <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-[110] flex items-center justify-center animate-in fade-in-0 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold">تم الشراء بنجاح</h2>
                        <p className="text-sm text-muted-foreground">هذا هو رقم الكرت الخاص بك.</p>
                        
                        <div className="w-full text-center space-y-2 bg-muted p-3 rounded-lg mt-2 font-mono text-xl">
                           <p>{purchasedCard.cardNumber}</p>
                        </div>
                        
                         <div className="w-full grid grid-cols-2 gap-3 pt-2">
                             <Button className="w-full" onClick={handleCopyCardDetails}>
                                 <Copy className="ml-2 h-4 w-4" />
                                 نسخ الكرت
                             </Button>
                             <Button variant="outline" className="w-full" onClick={() => setIsSmsDialogOpen(true)}>
                                <MessageSquare className="ml-2 h-4 w-4" />
                                إرسال SMS
                            </Button>
                         </div>

                        <div className="w-full pt-4">
                            <Button variant="outline" className="w-full" onClick={() => {
                                setPurchasedCard(null);
                                router.push('/login');
                            }}>العودة للرئيسية</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
        <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
            <DialogContent className="rounded-[32px] max-w-sm p-6">
                <DialogHeader>
                    <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="text-primary h-6 w-6" />
                    </div>
                    <DialogTitle className="text-center text-xl font-black">إرسال كرت لزبون</DialogTitle>
                    <DialogDescription className="text-center">
                        أدخل رقم جوال الزبون لإرسال تفاصيل الكرت إليه عبر رسالة نصية (SMS).
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                    <div className="space-y-2">
                        <Label htmlFor="sms-phone" className="text-sm font-bold text-muted-foreground pr-1">رقم جوال الزبون</Label>
                        <Input 
                            id="sms-phone"
                            placeholder="7xxxxxxxx" 
                            type="tel" 
                            value={smsRecipient} 
                            onChange={e => setSmsRecipient(e.target.value.replace(/\D/g, '').slice(0, 9))} 
                            className="text-center text-2xl font-black h-14 rounded-2xl border-2 focus-visible:ring-primary tracking-widest text-foreground" 
                        />
                    </div>
                </div>
                <DialogFooter className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => setIsSmsDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSendSms} className="flex-1 h-12 rounded-2xl font-bold" disabled={!smsRecipient || smsRecipient.length < 9}>إرسال الآن</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </>
    );
  }

  const renderContent = () => {
    if (isLoadingCategories) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
        );
    }

    if (!categories || categories.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center text-center h-64">
                <AlertCircle className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">لا توجد فئات كروت</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    لم يتم إضافة أي فئات كروت بعد.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {categories.map((category, index) => {
                return (
                    <Card key={category.id} className="overflow-hidden animate-in fade-in-0" style={{ animationDelay: `${index * 100}ms` }}>
                        <CardContent className="p-0 flex">
                            <div className="flex-none w-1/4 bg-accent/50 flex flex-col items-center justify-center p-4 text-accent-foreground">
                            <Database className="w-8 h-8 text-primary/80" />
                            {category.capacity && (
                                    <span className="font-bold text-sm text-center text-primary/80 mt-2">{category.capacity}</span>
                            )}
                            </div>
                            <div className="flex-grow p-3">
                                <div className='flex items-start justify-between gap-2'>
                                    <div className='space-y-1 text-right'>
                                        <h3 className="font-bold text-base">{category.name}</h3>
                                        <p className="font-semibold text-primary">{category.price.toLocaleString('en-US')} ريال</p>
                                    </div>
                                    <Button 
                                        size="default" 
                                        className="h-auto py-2 px-5 text-sm font-bold rounded-lg"
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            setIsConfirming(true);
                                        }}
                                    >
                                        شراء
                                    </Button>
                                </div>
                                <Separator className="my-2" />
                                <div className="text-xs text-muted-foreground flex items-center justify-start gap-x-4 gap-y-1">
                                    {category.validity && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> الصلاحية: {category.validity}</span>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
  };
  
  return (
    <>
        <div className="flex flex-col h-full bg-background">
            <SimpleHeader title={networkName} />
            <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
        </div>
        <Toaster />

        <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
            {selectedCategory && (
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center">تأكيد عملية الشراء</AlertDialogTitle>
                        <AlertDialogDescription className="text-center pt-2">
                            هل أنت متأكد من رغبتك في شراء كرت "{selectedCategory.name}"؟ سيتم خصم <span className="font-bold text-primary">{selectedCategory.price.toLocaleString('en-US')} ريال</span> من رصيدك.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurchase} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : 'تأكيد'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            )}
        </AlertDialog>
    </>
  );
}


export default function NetworkCardsPage() {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
        <NetworkPurchasePageComponent />
      </Suspense>
    );
}
