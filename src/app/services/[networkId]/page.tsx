'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc, query, where, getDocs, writeBatch, increment } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag, Calendar, Package, CheckCircle, Copy, AlertCircle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

type CardCategory = {
    id: string;
    name: string;
    price: number;
    capacity?: string;
    validity?: string;
    networkId: string;
};

type NetworkCard = {
    id: string;
    cardNumber: string;
    status: 'available' | 'sold';
    categoryId: string;
};

type UserProfile = {
  balance?: number;
};

export default function NetworkPurchasePage({ params }: { params: { networkId: string } }) {
  const { networkId } = React.use(params);
  const searchParams = useSearchParams();
  const networkName = searchParams.get('name') || 'شراء كروت';
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = React.useState<CardCategory | null>(null);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [purchasedCard, setPurchasedCard] = React.useState<NetworkCard | null>(null);

  const categoriesCollection = useMemoFirebase(() => (firestore ? collection(firestore, `networks/${networkId}/cardCategories`) : null), [firestore, networkId]);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<CardCategory>(categoriesCollection);

  const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handlePurchase = async () => {
    if (!selectedCategory || !user || !firestore || !userDocRef) return;

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
        const q = query(cardsRef, where('categoryId', '==', selectedCategory.id), where('status', '==', 'available'));
        const availableCardsSnapshot = await getDocs(q);

        if (availableCardsSnapshot.empty) {
            toast({
                variant: "destructive",
                title: "لا توجد كروت متاحة",
                description: "عذرًا، لا توجد كروت متاحة حاليًا في هذه الفئة.",
            });
            setIsProcessing(false);
            setIsConfirming(false);
            return;
        }

        const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
        const cardToPurchaseRef = doc(firestore, `networks/${networkId}/cards`, cardToPurchaseDoc.id);

        const batch = writeBatch(firestore);

        // 1. Mark card as sold
        batch.update(cardToPurchaseRef, { status: 'sold', soldTo: user.uid, soldTimestamp: new Date().toISOString() });
        
        // 2. Deduct balance from user
        batch.update(userDocRef, { balance: increment(-categoryPrice) });

        // 3. Create a transaction record
        const transactionRef = doc(collection(firestore, `users/${user.uid}/transactions`));
        batch.set(transactionRef, {
            userId: user.uid,
            transactionDate: new Date().toISOString(),
            amount: categoryPrice,
            transactionType: `شراء كرت ${selectedCategory.name}`,
            notes: `شبكة: ${networkName}`,
        });
        
        await batch.commit();

        setPurchasedCard({ id: cardToPurchaseDoc.id, ...cardToPurchaseDoc.data() } as NetworkCard);

    } catch (error) {
        console.error("Purchase failed:", error);
        toast({
            variant: "destructive",
            title: "فشلت عملية الشراء",
            description: "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  const handleCopyCardNumber = () => {
    if (purchasedCard) {
        navigator.clipboard.writeText(purchasedCard.cardNumber);
        toast({
            title: "تم النسخ",
            description: "تم نسخ رقم الكرت بنجاح.",
        });
    }
  };

  if (purchasedCard) {
    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold">تم الشراء بنجاح</h2>
                        <p className="text-sm text-muted-foreground">هذا هو رقم الكرت الخاص بك. يمكنك نسخه الآن.</p>
                        
                        <div className="w-full flex items-center justify-center bg-muted p-3 rounded-lg gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={handleCopyCardNumber}>
                                <Copy className="ml-1 h-4 w-4" />
                                نسخ
                            </Button>
                            <p className="text-xl font-mono tracking-widest text-primary dark:text-primary-foreground">{purchasedCard.cardNumber}</p>
                        </div>

                        <div className="w-full pt-4">
                            <Button variant="outline" className="w-full" onClick={() => setPurchasedCard(null)}>إغلاق</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
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
                    لم يقم المسؤول بإضافة أي فئات كروت لهذه الشبكة بعد.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {categories.map((category, index) => (
                <Card key={category.id} className="overflow-hidden animate-in fade-in-0" style={{ animationDelay: `${index * 100}ms` }}>
                    <CardContent className="p-4">
                       <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-primary dark:text-primary-foreground" />
                                    <span>فئة {category.price.toLocaleString('en-US')}</span>
                                </h3>
                                <p className="font-bold text-xl text-primary dark:text-primary-foreground">
                                    {category.price.toLocaleString('en-US')} ريال يمني
                                </p>
                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                                    {category.validity && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {category.validity}</span>}
                                    {category.capacity && <span className="flex items-center gap-1.5"><Package className="w-3 h-3" /> {category.capacity}</span>}
                                </div>
                            </div>
                            <Button 
                                size="lg" 
                                className="h-auto py-3 px-6 text-base font-bold"
                                onClick={() => {
                                    setSelectedCategory(category);
                                    setIsConfirming(true);
                                }}
                            >
                                شراء
                            </Button>
                       </div>
                    </CardContent>
                </Card>
            ))}
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
                            هل أنت متأكد من رغبتك في شراء كرت "{selectedCategory.name}"؟ سيتم خصم <span className="font-bold text-primary dark:text-primary-foreground">{selectedCategory.price.toLocaleString('en-US')} ريال</span> من رصيدك.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePurchase} disabled={isProcessing}>
                            {isProcessing ? 'جاري الشراء...' : 'تأكيد'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            )}
        </AlertDialog>
    </>
  );
}
