'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useUser, deleteDocumentNonBlocking, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, getDocs, writeBatch, increment, limit as firestoreLimit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi, MapPin, Heart, Search, X, AlertCircle, Database, Calendar, CheckCircle, Copy, MessageSquare, Wallet, Smartphone, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type Favorite = {
  id: string;
  userId: string;
  targetId: string; // Network ID
  name: string;
  location: string;
  phoneNumber?: string;
  favoriteType: 'Network';
  isLocal?: boolean;
};

type CardCategory = {
    id: string | number;
    name: string;
    price: number;
    dataLimit?: string;
    validity?: string;
    expirationDate?: string;
    capacity?: string; // Local network field
};

type CombinedNetwork = {
    id: string;
    name: string;
    location: string;
    phoneNumber?: string;
    isLocal: boolean;
    ownerId?: string;
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

export default function FavoritesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Popup States
  const [selectedNetwork, setSelectedNetwork] = useState<CombinedNetwork | null>(null);
  const [categories, setCategories] = useState<CardCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  
  // Purchase States
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<any>(null);
  const [showConfirmPurchase, setShowConfirmPurchase] = useState<CardCategory | null>(null);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Favorites Query
  const favoritesQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'favorites'),
            where('favoriteType', '==', 'Network')
          )
        : null,
    [firestore, user]
  );
  const { data: favorites, isLoading } = useCollection<Favorite>(favoritesQuery);

  // User Profile
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const filteredFavorites = useMemo(() => {
    if (!favorites) return [];
    return favorites.filter(fav => 
      fav.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fav.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [favorites, searchTerm]);

  const handleRemoveFavorite = (e: React.MouseEvent, favoriteId: string, networkName: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore) return;
    const docRef = doc(firestore, 'users', user.uid, 'favorites', favoriteId);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'تمت الإزالة',
      description: `تمت إزالة "${networkName}" من المفضلة.`,
    });
  };

  const handleNetworkClick = async (fav: Favorite) => {
    const isLocal = fav.isLocal ?? isNaN(Number(fav.targetId));
    
    let ownerId = undefined;
    if (isLocal && firestore) {
        const netSnap = await getDocs(query(collection(firestore, 'networks'), where('__name__', '==', fav.targetId)));
        if (!netSnap.empty) {
            ownerId = netSnap.docs[0].data().ownerId;
        }
    }

    const network: CombinedNetwork = {
        id: fav.targetId,
        name: fav.name,
        location: fav.location,
        phoneNumber: fav.phoneNumber,
        isLocal: isLocal,
        ownerId: ownerId
    };

    setSelectedNetwork(network);
    setCategories([]);
    setIsLoadingCategories(true);
    setCategoryError(null);
    setPurchasedCard(null);

    try {
      if (isLocal && firestore) {
        const catsRef = collection(firestore, `networks/${fav.targetId}/cardCategories`);
        const snapshot = await getDocs(catsRef).catch(async (err) => {
            const permissionError = new FirestorePermissionError({
                path: `networks/${fav.targetId}/cardCategories`,
                operation: 'list'
            });
            errorEmitter.emit('permission-error', permissionError);
            throw err;
        });
        const catsData = snapshot.docs.map(d => {
            const data = d.data();
            return { 
                id: d.id, 
                ...data,
                dataLimit: data.capacity 
            } as CardCategory;
        });
        setCategories(catsData);
      } else {
        const response = await fetch(`/services/networks-api/${fav.targetId}/classes`);
        if (!response.ok) throw new Error('فشل تحميل الفئات الخارجية');
        const data = await response.json();
        setCategories(data.map((c: any) => ({
            id: c.id,
            name: c.name,
            price: c.price,
            dataLimit: c.dataLimit,
            expirationDate: c.expirationDate
        })));
      }
    } catch (err: any) {
      if (err.code !== 'permission-denied') {
        setCategoryError(err.message || 'حدث خطأ أثناء جلب الفئات');
      }
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handlePurchase = async () => {
    const selectedCategory = showConfirmPurchase;
    if (!selectedCategory || !selectedNetwork || !user || !userProfile || !firestore || !userDocRef) {
        toast({ variant: "destructive", title: "خطأ", description: "بيانات الشراء غير مكتملة." });
        return;
    }

    setIsProcessing(true);
    const categoryPrice = selectedCategory.price;
    const userBalance = userProfile?.balance ?? 0;

    if (userBalance < categoryPrice) {
        toast({ variant: "destructive", title: "رصيد غير كافٍ", description: "رصيدك الحالي لا يكفي لإتمام عملية الشراء." });
        setIsProcessing(false);
        setShowConfirmPurchase(null);
        return;
    }

    try {
        const now = new Date().toISOString();
        const batch = writeBatch(firestore);

        if (selectedNetwork.isLocal) {
            const cardsRef = collection(firestore, `networks/${selectedNetwork.id}/cards`);
            const q = query(cardsRef, where('categoryId', '==', selectedCategory.id), where('status', '==', 'available'), firestoreLimit(1));
            const availableCardsSnapshot = await getDocs(q);

            if (availableCardsSnapshot.empty) throw new Error('لا توجد كروت متاحة في هذه الفئة حالياً.');

            const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
            const cardData = cardToPurchaseDoc.data();
            const ownerId = selectedNetwork.ownerId!;
            const commission = Math.floor(categoryPrice * 0.10);
            const payoutAmount = categoryPrice - commission;

            // 1. تحديث حالة الكرت
            batch.update(cardToPurchaseDoc.ref, { status: 'sold', soldTo: user.uid, soldTimestamp: now });
            
            // 2. خصم الرصيد من المشتري
            batch.update(userDocRef, { balance: increment(-categoryPrice) });
            
            // 3. إضافة الرصيد للمالك
            const ownerRef = doc(firestore, 'users', ownerId);
            batch.update(ownerRef, { balance: increment(payoutAmount) });

            // 4. سجل عملية للمشتري
            const buyerTxRef = doc(collection(firestore, `users/${user.uid}/transactions`));
            batch.set(buyerTxRef, {
                userId: user.uid, 
                transactionDate: now, 
                amount: categoryPrice,
                transactionType: `شراء كرت ${selectedCategory.name}`, 
                notes: `شبكة: ${selectedNetwork.name}`,
                cardNumber: cardData.cardNumber,
            });
            
            // 5. سجل عملية للمالك
            const ownerTxRef = doc(collection(firestore, `users/${ownerId}/transactions`));
            batch.set(ownerTxRef, {
                userId: ownerId, 
                transactionDate: now, 
                amount: payoutAmount,
                transactionType: 'أرباح بيع كرت', 
                notes: `بيع كرت ${selectedCategory.name} للمشتري ${userProfile.displayName || 'مشترك'}`,
            });
            
            // 6. سجل الكروت المباعة
            const soldCardRef = doc(collection(firestore, 'soldCards'));
            batch.set(soldCardRef, {
                networkId: selectedNetwork.id, 
                ownerId, 
                networkName: selectedNetwork.name,
                categoryId: selectedCategory.id, 
                categoryName: selectedCategory.name,
                cardId: cardToPurchaseDoc.id, 
                cardNumber: cardData.cardNumber,
                price: categoryPrice, 
                commissionAmount: commission, 
                payoutAmount,
                buyerId: user.uid, 
                buyerName: userProfile.displayName || 'مشترك',
                buyerPhoneNumber: userProfile.phoneNumber || '', 
                soldTimestamp: now, 
                payoutStatus: 'completed'
            });

            await batch.commit().catch(async (err) => {
                const permissionError = new FirestorePermissionError({
                    path: `batch_purchase/${selectedNetwork.id}`,
                    operation: 'write',
                    requestResourceData: { categoryId: selectedCategory.id }
                });
                errorEmitter.emit('permission-error', permissionError);
                throw err;
            });

            setPurchasedCard({ cardID: cardData.cardNumber });
            setShowConfirmPurchase(null);
            setSelectedNetwork(null); 
        } else {
            const response = await fetch(`/services/networks-api/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: selectedCategory.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.message || 'فشل إنشاء الطلب.');
            }

            const result = await response.json();
            const cardData = result.data.order.card;

            batch.update(userDocRef, { balance: increment(-categoryPrice) });
            const buyerTxRef = doc(collection(firestore, `users/${user.uid}/transactions`));
            batch.set(buyerTxRef, {
                userId: user.uid, 
                transactionDate: now, 
                amount: categoryPrice,
                transactionType: `شراء كرت ${selectedCategory.name}`, 
                notes: `شبكة: ${selectedNetwork.name}`,
                cardNumber: cardData.cardID,
            });

            await batch.commit();
            setPurchasedCard(cardData);
            setShowConfirmPurchase(null);
            setSelectedNetwork(null); 
        }
        
        audioRef.current?.play().catch(() => {});
    } catch (error: any) {
        console.error("Purchase failed:", error);
        if (error.code !== 'permission-denied') {
            toast({ variant: "destructive", title: "فشلت عملية الشراء", description: error.message || "حدث خطأ غير متوقع." });
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (purchasedCard) {
        navigator.clipboard.writeText(purchasedCard.cardID || purchasedCard.cardNumber);
        toast({ title: "تم النسخ", description: "تم نسخ رقم الكرت بنجاح." });
    }
  };

  const handleSendSms = () => {
    if (!purchasedCard || !selectedNetwork || !smsRecipient) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم الزبون.' });
        return;
    }
    const msg = `شبكة: ${selectedNetwork.name}\nرقم الكرت: ${purchasedCard.cardID || purchasedCard.cardNumber}`;
    window.location.href = `sms:${smsRecipient}?body=${encodeURIComponent(msg)}`;
    setIsSmsDialogOpen(false);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background text-foreground">
        <SimpleHeader title="المفضلة" />
        <div className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="البحث في المفضلة..."
              className="w-full pr-10 rounded-xl h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="p-4 rounded-2xl animate-pulse"><div className="flex gap-4"><Skeleton className="h-12 w-12 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div></Card>
                    ))}
                </div>
            ) : !favorites || favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-64">
                    <Heart className="h-16 w-16 text-muted-foreground opacity-20" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">لا توجد شبكات مفضلة</h3>
                    <p className="mt-1 text-sm text-muted-foreground">أضف شبكتك المفضلة هنا للوصول إليها بسرعة</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredFavorites.map((fav, index) => (
                        <Card 
                            key={fav.id} 
                            className="bg-mesh-gradient cursor-pointer text-white hover:opacity-90 transition-all rounded-2xl animate-in fade-in-0 slide-in-from-bottom-2 border-none shadow-md"
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => handleNetworkClick(fav)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="p-3 bg-white/20 rounded-xl"><Wifi className="h-6 w-6 text-white" /></div>
                                <div className="flex-1 text-right mx-4 space-y-1 text-white">
                                    <h4 className="font-bold text-base text-white">{fav.name}</h4>
                                    <p className="text-[10px] opacity-80 text-white/80">{fav.location}</p>
                                </div>
                                <button 
                                    onClick={(e) => handleRemoveFavorite(e, fav.id, fav.name)}
                                    className="p-2 hover:scale-110 transition-transform"
                                >
                                    <Heart className={cn("h-6 w-6 text-white fill-white")} />
                                </button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Details Popup */}
      <Dialog open={!!selectedNetwork} onOpenChange={(open) => !open && !isProcessing && setSelectedNetwork(null)}>
        <DialogContent className="max-w-[95%] sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden bg-white dark:bg-slate-950">
          {selectedNetwork && (
            <div className="flex flex-col max-h-[85vh]">
              <DialogHeader className="sr-only">
                <DialogTitle>{selectedNetwork.name}</DialogTitle>
                <DialogDescription>تفاصيل الشبكة والفئات المتاحة للشراء</DialogDescription>
              </DialogHeader>
              <div className="bg-mesh-gradient p-6 text-white relative">
                <div className="flex flex-col items-center text-center gap-2 mt-2">
                  <div className="bg-white/20 p-4 rounded-full border-2 border-white/30 backdrop-blur-md shadow-xl animate-in zoom-in-95 duration-500">
                    <Wifi className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-xl font-black text-white mt-2">{selectedNetwork.name}</h2>
                  <p className="text-xs opacity-80 text-white/80">{selectedNetwork.location}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-background">
                {isLoadingCategories ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                  </div>
                ) : categoryError ? (
                  <div className="text-center py-10 space-y-2"><AlertCircle className="h-10 w-10 mx-auto text-destructive" /><p className="text-sm font-bold">{categoryError}</p></div>
                ) : categories.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">لا توجد فئات متاحة حالياً.</p>
                ) : (
                  <div className="space-y-3">
                    {categories.map((cat) => (
                      <Card 
                        key={cat.id} 
                        className="rounded-2xl border-none shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setShowConfirmPurchase(cat)}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 text-right space-y-1">
                            <h4 className="font-bold text-sm text-foreground">{cat.name}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                {cat.dataLimit && <span className="flex items-center gap-1"><Database className="h-3 w-3" />{cat.dataLimit}</span>}
                                {(cat.validity || cat.expirationDate) && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{cat.validity || cat.expirationDate}</span>}
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="font-black text-primary text-base">{cat.price.toLocaleString()} ريال</p>
                            <Button size="sm" className="h-7 rounded-lg text-[10px] px-4 mt-1">شراء</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 bg-background border-t">
                <Button variant="outline" className="w-full rounded-2xl h-12 font-bold" onClick={() => setSelectedNetwork(null)}>إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[28px] max-w-sm text-center bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>تأكيد الشراء</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من شراء كرت "{showConfirmPurchase?.name}"؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 bg-muted/50 rounded-2xl space-y-2">
            <p className="text-xs text-muted-foreground">سيتم خصم المبلغ من رصيدك</p>
            <p className="text-2xl font-black text-primary">{showConfirmPurchase?.price.toLocaleString()} ريال</p>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button className="w-full rounded-xl" onClick={handlePurchase} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : 'تأكيد'}
            </Button>
            <Button variant="outline" className="w-full rounded-xl mt-0" onClick={() => setShowConfirmPurchase(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Popup */}
      {purchasedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in-0">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-background">
                <div className="bg-green-500 p-8 flex justify-center">
                    <div className="bg-white/20 p-4 rounded-full animate-bounce">
                        <CheckCircle className="h-16 w-16 text-white" />
                    </div>
                </div>
                <CardContent className="p-8 space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-green-600">تم الشراء بنجاح!</h2>
                        <p className="text-sm text-muted-foreground mt-1">احتفظ برقم الكرت جيداً</p>
                    </div>
                    
                    <div className="p-6 bg-muted rounded-[24px] border-2 border-dashed border-primary/20 space-y-3">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">رقم الكرت</p>
                        <p className="text-3xl font-black font-mono tracking-tighter text-foreground">
                            {purchasedCard.cardID || purchasedCard.cardNumber}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <Button className="rounded-2xl h-12 font-bold" onClick={handleCopy}>
                            <Copy className="ml-2 h-4 w-4" /> نسخ الكرت
                        </Button>
                        <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => setIsSmsDialogOpen(true)}>
                            <MessageSquare className="ml-2 h-4 w-4" /> إرسال SMS
                        </Button>
                    </div>
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setPurchasedCard(null); setSelectedNetwork(null); }}>إغلاق</Button>
                </CardContent>
            </Card>
        </div>
      )}

      {/* SMS Dialog */}
      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
        <DialogContent className="rounded-[32px] max-w-sm p-6 z-[10000] bg-white dark:bg-slate-900">
            <DialogHeader>
                <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="text-primary h-6 w-6" />
                </div>
                <DialogTitle className="text-center text-xl font-black">إرسال كرت لزبون</DialogTitle>
                <DialogDescription className="text-center">
                    أدخل رقم جوال الزبون لإرسال تفاصيل الكرت إليه عبر رسالة نصية (SMS).
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-6">
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
            <DialogFooter className="grid grid-cols-2 gap-3">
                <Button onClick={handleSendSms} className="w-full h-12 rounded-2xl font-bold" disabled={!smsRecipient || smsRecipient.length < 9}>إرسال الآن</Button>
                <Button variant="outline" className="w-full h-12 rounded-2xl font-bold mt-0" onClick={() => setIsSmsDialogOpen(false)}>إلغاء</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {isProcessing && <ProcessingOverlay message="جاري معالجة طلبك..." />}
      <Toaster />
    </>
  );
}