'use client';

import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle, Copy, AlertCircle, Database } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

type CardCategory = {
    id: number;
    name: string;
    price: number;
    dataLimit?: string;
    expirationDate?: string;
};

type NetworkCard = {
    cardID: string;
    cardPass: string;
};

type OrderResponse = {
    data: {
        order: {
            uuidOrder: string;
            card: NetworkCard;
        }
    }
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

function NetworkPurchasePageComponent() {
  const params = useParams();
  const networkId = params.networkId as string;
  const searchParams = useSearchParams();
  const networkName = searchParams.get('name') || 'شراء كروت';
  
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [categories, setCategories] = useState<CardCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<CardCategory | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<NetworkCard | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
        if (!networkId) return;
        setIsLoadingCategories(true);
        setError(null);
        try {
            const response = await fetch(`/services/networks-api/${networkId}/classes`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch categories');
            }
            const data = await response.json();
            setCategories(data);
        } catch (err: any) {
            setError(err.message || 'لا يمكن تحميل الفئات حالياً.');
            console.error(err);
        } finally {
            setIsLoadingCategories(false);
        }
    };
    fetchCategories();
  }, [networkId]);


  const userDocRef = useMemo(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const handlePurchase = async () => {
    if (!selectedCategory || !user || !userProfile || !firestore || !userDocRef) return;

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
        const response = await fetch(`/services/networks-api/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                classId: selectedCategory.id,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData?.message || 'فشل إنشاء الطلب.');
        }

        const result: OrderResponse = await response.json();
        const cardData = result.data.order.card;
        
        // Firestore batch write
        const batch = writeBatch(firestore);
        const now = new Date().toISOString();

        // 1. Deduct balance from user
        batch.update(userDocRef!, { balance: increment(-categoryPrice) });

        // 2. Create a transaction record for buyer
        const buyerTransactionRef = doc(collection(firestore, `users/${user.uid}/transactions`));
        batch.set(buyerTransactionRef, {
            userId: user.uid,
            transactionDate: now,
            amount: categoryPrice,
            transactionType: `شراء كرت ${selectedCategory.name}`,
            notes: `شبكة: ${networkName}`,
        });
        
        await batch.commit();

        setPurchasedCard(cardData);

    } catch (error: any) {
        console.error("Purchase failed:", error);
        toast({
            variant: "destructive",
            title: "فشلت عملية الشراء",
            description: error.message || "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.",
        });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  const handleCopyCardDetails = () => {
    if (purchasedCard) {
        const cardDetails = `رقم الكرت: ${purchasedCard.cardID}\nكلمة المرور: ${purchasedCard.cardPass}`;
        navigator.clipboard.writeText(cardDetails);
        toast({
            title: "تم النسخ",
            description: "تم نسخ تفاصيل الكرت بنجاح.",
        });
    }
  };

  if (purchasedCard) {
    return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl">
                <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold">تم الشراء بنجاح</h2>
                        <p className="text-sm text-muted-foreground">هذه هي تفاصيل الكرت الخاص بك. يمكنك نسخها الآن.</p>
                        
                        <div className="w-full text-right space-y-2 bg-muted p-3 rounded-lg mt-2 font-mono">
                           <p>ID: {purchasedCard.cardID}</p>
                           <p>Pass: {purchasedCard.cardPass}</p>
                        </div>
                        
                         <Button className="w-full" onClick={handleCopyCardDetails}>
                             <Copy className="ml-2 h-4 w-4" />
                             نسخ التفاصيل
                         </Button>

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

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center text-center h-64">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <h3 className="mt-4 text-lg font-semibold">حدث خطأ</h3>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
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
                    <CardContent className="p-0 flex">
                        <div className="flex-none w-1/4 bg-accent/50 flex flex-col items-center justify-center p-4 text-accent-foreground">
                           <Database className="w-8 h-8 text-primary/80" />
                           {category.dataLimit && (
                                <span className="font-bold text-sm text-center text-primary/80 mt-2">{category.dataLimit}</span>
                           )}
                        </div>
                        <div className="flex-grow p-3">
                             <div className='flex items-start justify-between gap-2'>
                                <div className='space-y-1 text-right'>
                                     <h3 className="font-bold text-base">{category.name}</h3>
                                     <p className="font-semibold text-primary dark:text-primary-foreground">{category.price.toLocaleString('en-US')} ريال يمني</p>
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
                                 {category.expirationDate && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> الصلاحية: {category.expirationDate}</span>}
                             </div>
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


export default function NetworkPurchasePage() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <NetworkPurchasePageComponent />
      </Suspense>
    );
}
