'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Wifi, 
  Heart, 
  AlertCircle, 
  Database, 
  Calendar, 
  CheckCircle, 
  Copy, 
  MessageSquare, 
  Loader2,
  Smartphone,
  X,
  Globe,
  Clock,
  Star,
  Trophy,
  Megaphone
} from 'lucide-react';
import { 
  useCollection, 
  useFirestore, 
  useMemoFirebase, 
  useUser, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useDoc
} from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  doc, 
  writeBatch, 
  increment, 
  getDocs, 
  limit as firestoreLimit 
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
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

export const dynamic = 'force-dynamic';

// Types
type CombinedNetwork = {
    id: string;
    name: string;
    location: string;
    phoneNumber?: string;
    ownerId?: string;
    isLocal: boolean;
};

type CardCategory = {
    id: string | number;
    name: string;
    price: number;
    capacity?: string;
    validity?: string;
    expirationDate?: string;
};

type Favorite = {
    id: string;
    targetId: string;
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

const CustomLoader = () => (
  <div className="bg-card/90 p-4 rounded-3xl shadow-2xl flex items-center justify-center w-24 h-24 animate-in zoom-in-95 border border-white/10">
    <div className="relative w-12 h-12">
      <svg
        viewBox="0 0 50 50"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        <path d="M15 25 A10 10 0 0 0 35 25" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" />
        <path d="M40 15 A15 15 0 0 1 40 35" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" className="opacity-30" />
      </svg>
    </div>
  </div>
);

export default function CombinedNetworksPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [apiNetworks, setApiNetworks] = useState<CombinedNetwork[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);

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

  // Fetch local networks
  const localNetworksQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'networks') : null),
    [firestore]
  );
  const { data: localNetworks, isLoading: isLoadingLocal } = useCollection<any>(localNetworksQuery);

  // Fetch API networks
  useEffect(() => {
    const fetchApiNetworks = async () => {
      setIsLoadingApi(true);
      try {
        const response = await fetch('/services/networks-api');
        if (response.ok) {
          const data = await response.json();
          setApiNetworks(data.map((n: any) => ({
            id: String(n.id),
            name: n.name,
            location: n.desc || 'شبكة API',
            isLocal: false,
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingApi(false);
      }
    };
    fetchApiNetworks();
  }, []);

  // Combine All Networks
  const allNetworksCombined = useMemo(() => {
    const local = (localNetworks || []).map(n => ({ ...n, isLocal: true }));
    const api = apiNetworks;
    const combined = [...local, ...api];
    
    if (!searchTerm) return combined;
    
    return combined.filter(net => 
        net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        net.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localNetworks, apiNetworks, searchTerm]);

  // User Profile
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  // Favorites
  const favoritesQuery = useMemoFirebase(
    () =>
      user && firestore
        ? query(collection(firestore, 'users', user.uid, 'favorites'), where('favoriteType', '==', 'Network'))
        : null,
    [firestore, user]
  );
  const { data: favorites } = useCollection<Favorite>(favoritesQuery);
  const favoriteNetworkIds = useMemo(() => new Set(favorites?.map(f => f.targetId)), [favorites]);

  const handleNetworkClick = async (network: CombinedNetwork) => {
    setSelectedNetwork(network);
    setCategories([]);
    setIsLoadingCategories(true);
    setCategoryError(null);
    setPurchasedCard(null);

    try {
      if (network.isLocal && firestore) {
        const catsRef = collection(firestore, `networks/${network.id}/cardCategories`);
        const snapshot = await getDocs(catsRef).catch(async (err) => {
            const contextualError = new FirestorePermissionError({
                path: `networks/${network.id}/cardCategories`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', contextualError);
            throw err;
        });
        setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CardCategory)));
      } else {
        const response = await fetch(`/services/networks-api/${network.id}/classes`);
        if (!response.ok) throw new Error('فشل تحميل الفئات');
        const data = await response.json();
        setCategories(data.map((c: any) => ({
            id: c.id, name: c.name, price: c.price, capacity: c.dataLimit, expirationDate: c.expirationDate
        })));
      }
    } catch (err: any) {
      if (err.name !== 'FirebaseError') {
        setCategoryError(err.message || 'حدث خطأ أثناء جلب الفئات');
      }
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent, network: CombinedNetwork) => {
    e.preventDefault(); e.stopPropagation();
    if (!user || !firestore) return;
    const isFavorited = favoriteNetworkIds.has(network.id);
    if (isFavorited) {
      const fav = favorites?.find(f => f.targetId === network.id);
      if (fav) deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'favorites', fav.id));
    } else {
      addDocumentNonBlocking(collection(firestore, 'users', user.uid, 'favorites'), {
        userId: user.uid, targetId: network.id, name: network.name, location: network.location, favoriteType: 'Network', isLocal: network.isLocal
      });
    }
  };

  const handlePurchase = async () => {
    const selectedCategory = showConfirmPurchase;
    if (!selectedCategory || !selectedNetwork || !user || !userProfile || !firestore || !userDocRef) return;
    setIsProcessing(true);
    try {
        const now = new Date().toISOString();
        const batch = writeBatch(firestore);

        if (selectedNetwork.isLocal) {
            const cardsRef = collection(firestore, `networks/${selectedNetwork.id}/cards`);
            const q = query(cardsRef, where('categoryId', '==', selectedCategory.id), where('status', '==', 'available'), firestoreLimit(1));
            const availableCardsSnapshot = await getDocs(q);

            if (availableCardsSnapshot.empty) throw new Error('لا توجد كروت متاحة حالياً في هذه الفئة.');
            
            const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
            const cardData = cardToPurchaseDoc.data();
            
            const commission = Math.floor(selectedCategory.price * 0.10);
            const payoutAmount = selectedCategory.price - commission;

            // 1. تحديث حالة الكرت
            batch.update(cardToPurchaseDoc.ref, { status: 'sold', soldTo: user.uid, soldTimestamp: now });
            
            // 2. خصم الرصيد من المشتري
            batch.update(userDocRef, { balance: increment(-selectedCategory.price) });
            
            // 3. التحويل التلقائي للمالك (90% من القيمة)
            const ownerId = selectedNetwork.ownerId;
            if (ownerId && ownerId !== 'admin') {
                const ownerDocRef = doc(firestore, 'users', ownerId);
                batch.update(ownerDocRef, { balance: increment(payoutAmount) });

                // سجل عملية للمالك
                const ownerTxRef = doc(collection(firestore, `users/${ownerId}/transactions`));
                batch.set(ownerTxRef, {
                    userId: ownerId,
                    transactionDate: now,
                    amount: payoutAmount,
                    transactionType: 'أرباح مبيعات الكروت',
                    notes: `أرباح بيع كرت ${selectedCategory.name} - شبكة: ${selectedNetwork.name}`
                });
            }
            
            // 4. سجل عملية للمشتري
            batch.set(doc(collection(firestore, `users/${user.uid}/transactions`)), {
                userId: user.uid, transactionDate: now, amount: selectedCategory.price,
                transactionType: `شراء كرت ${selectedCategory.name}`, notes: `شبكة: ${selectedNetwork.name}`,
                cardNumber: cardData.cardNumber,
            });

            // 5. سجل الكروت المباعة (حالة مكتملة تلقائياً)
            batch.set(doc(collection(firestore, 'soldCards')), {
                networkId: selectedNetwork.id, 
                ownerId: ownerId || 'admin', 
                networkName: selectedNetwork.name,
                categoryId: selectedCategory.id, 
                categoryName: selectedCategory.name,
                cardId: cardToPurchaseDoc.id, 
                cardNumber: cardData.cardNumber,
                price: selectedCategory.price, 
                commissionAmount: commission, 
                payoutAmount,
                buyerId: user.uid, 
                buyerName: userProfile.displayName || 'مشترك',
                buyerPhoneNumber: userProfile.phoneNumber || '', 
                soldTimestamp: now, 
                payoutStatus: 'completed'
            });

            await batch.commit().catch(async (err) => {
                const contextualError = new FirestorePermissionError({
                    path: `batch_purchase/${selectedNetwork.id}`,
                    operation: 'write',
                    requestResourceData: { cardId: cardToPurchaseDoc.id }
                });
                errorEmitter.emit('permission-error', contextualError);
                throw err;
            });
            
            setPurchasedCard({ cardID: cardData.cardNumber });
        } else {
            const response = await fetch(`/services/networks-api/order`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: selectedCategory.id })
            });
            if (!response.ok) throw new Error('فشل الطلب من المصدر الخارجي');
            const result = await response.json();
            const cardData = result.data.order.card;
            
            batch.update(userDocRef, { balance: increment(-selectedCategory.price) });
            batch.set(doc(collection(firestore, `users/${user.uid}/transactions`)), {
                userId: user.uid, transactionDate: now, amount: selectedCategory.price,
                transactionType: `شراء كرت ${selectedCategory.name}`, notes: `شبكة: ${selectedNetwork.name}`,
                cardNumber: cardData.cardID,
            });
            await batch.commit();
            setPurchasedCard(cardData);
        }
        setShowConfirmPurchase(null);
        setSelectedNetwork(null);
        audioRef.current?.play().catch(() => {});
    } catch (error: any) {
        console.error("Purchase execution error:", error);
        if (error.name !== 'FirebaseError') {
            toast({ variant: "destructive", title: "فشل العملية", description: error.message || "حدث خطأ غير متوقع أثناء الشراء." });
        }
    } finally { setIsProcessing(false); }
  };

  const handleCopy = () => {
    if (purchasedCard) {
        navigator.clipboard.writeText(purchasedCard.cardID || purchasedCard.cardNumber);
        toast({ title: "تم النسخ" });
    }
  };

  const handleSendSms = () => {
    if (!purchasedCard || !selectedNetwork || !smsRecipient) return;
    const msg = `شبكة: ${selectedNetwork.name}\nرقم الكرت: ${purchasedCard.cardID || purchasedCard.cardNumber}`;
    window.location.href = `sms:${smsRecipient}?body=${encodeURIComponent(msg)}`;
    setIsSmsDialogOpen(false);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background text-foreground">
        <SimpleHeader title="الشبكات" />
        <div className="p-4">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="text" 
                    placeholder="البحث في الشبكات..." 
                    className="w-full pr-10 rounded-xl h-12 bg-muted/20 border-2 border-black/10 focus-visible:ring-primary shadow-sm" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-4">
            {isLoadingLocal || isLoadingApi ? (
                <div className="flex justify-center py-20"><CustomLoader /></div>
            ) : allNetworksCombined.length === 0 ? (
                <div className="text-center py-20 opacity-40"><Wifi className="h-16 w-16 mx-auto mb-4" /><p className="font-bold">لا توجد شبكات متاحة حالياً</p></div>
            ) : (
                allNetworksCombined.map((net, index) => (
                    <Card 
                        key={net.id} 
                        className="bg-mesh-gradient cursor-pointer text-white rounded-2xl border-none shadow-md overflow-hidden animate-in fade-in-0 slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => handleNetworkClick(net)}
                    >
                        <CardContent className="p-4 flex items-center justify-between gap-2">
                            {/* أيقونة الشبكة على اليمين */}
                            <div className="p-3 bg-white/20 rounded-xl shrink-0 backdrop-blur-sm border border-white/10 order-2">
                                <Wifi className="h-6 w-6 text-white" />
                            </div>
                            
                            {/* اسم وموقع الشبكة في المنتصف */}
                            <div className="flex-1 text-right mx-2 space-y-0.5 overflow-hidden order-1">
                                <h4 className="font-black text-base text-white truncate">{net.name}</h4>
                                <p className="text-[10px] text-white/70 font-bold truncate opacity-80">{net.location}</p>
                            </div>
                            
                            {/* زر القلب على اليسار */}
                            <button onClick={(e) => handleFavoriteClick(e, net)} className="p-2.5 hover:scale-110 transition-transform bg-white/10 rounded-full shrink-0 order-0">
                                <Heart className={cn("h-5 w-5 text-white", favoriteNetworkIds.has(net.id) && 'fill-white')} />
                            </button>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      </div>

      <Dialog open={!!selectedNetwork} onOpenChange={(open) => !open && !isProcessing && setSelectedNetwork(null)}>
        <DialogContent className="max-w-[95%] sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden bg-white dark:bg-slate-950">
          {selectedNetwork && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="bg-mesh-gradient pt-14 pb-10 px-8 text-white text-center relative">
                <DialogHeader>
                    <DialogTitle className="sr-only">{selectedNetwork?.name || 'تفاصيل الشبكة'}</DialogTitle>
                    <DialogDescription className="sr-only">استعراض فئات الكروت المتاحة للشبكة المختارة</DialogDescription>
                </DialogHeader>
                <div className="bg-white/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 backdrop-blur-md border border-white/20">
                    <Wifi className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-black text-white">{selectedNetwork.name}</h2>
                <p className="text-xs text-white/70 font-bold mt-1">{selectedNetwork.location}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
                {isLoadingCategories ? ( <div className="flex justify-center py-10"><CustomLoader /></div> ) : categoryError ? ( <p className="text-center text-destructive font-bold p-4 bg-destructive/10 rounded-2xl">{categoryError}</p> ) : (
                  <div className="space-y-3">
                    {categories.map(cat => (
                        <Card key={cat.id} className="rounded-2xl cursor-pointer bg-muted/30 border-none hover:bg-muted/50 transition-colors" onClick={() => setShowConfirmPurchase(cat)}>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div className="text-right space-y-1">
                                    <h4 className="font-black text-sm text-foreground">{cat.name}</h4>
                                    <div className="flex gap-3 text-[10px] font-bold text-muted-foreground">
                                        {cat.capacity && <span className="flex items-center gap-1"><Database className="h-3 w-3" /> {cat.capacity}</span>}
                                        {(cat.validity || cat.expirationDate) && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {cat.validity || cat.expirationDate}</span>}
                                    </div>
                                </div>
                                <div className="text-left"><p className="font-black text-primary text-lg">{cat.price.toLocaleString()} <span className="text-[10px]">ر.ي</span></p></div>
                            </CardContent>
                        </Card>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-white dark:bg-slate-900"><Button variant="outline" className="w-full h-12 rounded-2xl font-black" onClick={() => setSelectedNetwork(null)}>إغلاق</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[32px] max-sm text-center bg-white dark:bg-slate-900 z-[10000] border-none shadow-2xl outline-none">
          <DialogHeader>
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-center font-black text-xl">تأكيد عملية الشراء</DialogTitle>
            <DialogDescription className="text-center font-bold">
              هل أنت متأكد من شراء كرت <span className="text-primary">"{showConfirmPurchase?.name}"</span>؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 bg-muted/30 rounded-[28px] border-2 border-dashed border-primary/10 space-y-2 mt-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">سيتم خصم المبلغ من رصيدك</p>
            <p className="text-3xl font-black text-primary">{showConfirmPurchase?.price.toLocaleString()} <span className="text-sm">ريال</span></p>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-3 mt-6">
            <Button className="w-full h-12 rounded-2xl font-black text-base shadow-lg shadow-primary/20" onClick={handlePurchase} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : 'تأكيد الشراء'}
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-2xl font-black text-base mt-0" onClick={() => setShowConfirmPurchase(null)}>تراجع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {purchasedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] border-none bg-background overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="sr-only">تم الشراء بنجاح</DialogTitle>
                    <DialogDescription className="sr-only">تفاصيل الكرت الذي تم شراؤه</DialogDescription>
                </DialogHeader>
                <div className="bg-green-500 p-8 flex justify-center"><CheckCircle className="h-16 w-16 text-white animate-bounce" /></div>
                <CardContent className="p-8 space-y-6">
                    <div><h2 className="text-2xl font-black text-green-600">تم الشراء بنجاح!</h2><p className="text-3xl font-black font-mono mt-6 tracking-[0.2em] bg-muted py-4 rounded-2xl border-2 border-dashed border-primary/20">{purchasedCard.cardID || purchasedCard.cardNumber}</p></div>
                    <div className="grid grid-cols-2 gap-3">
                        <Button className="rounded-2xl h-12 font-black" onClick={handleCopy}><Copy className="ml-2 h-4 w-4" /> نسخ الكرت</Button>
                        <Button variant="outline" className="rounded-2xl h-12 font-black" onClick={() => setIsSmsDialogOpen(true)}><MessageSquare className="ml-2 h-4 w-4" /> ارسال SMS</Button>
                    </div>
                    <Button variant="ghost" className="w-full text-muted-foreground font-bold" onClick={() => { setPurchasedCard(null); setSelectedNetwork(null); }}>إغلاق</Button>
                </CardContent>
            </Card>
        </div>
      )}

      {/* SMS Dialog */}
      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
        <DialogContent className="rounded-[32px] max-sm p-6 z-[10002] bg-white dark:bg-slate-900 border-none shadow-2xl outline-none">
            <DialogHeader>
                <DialogTitle className="text-center text-xl font-black">ارسال كرت لزبون</DialogTitle>
                <DialogDescription className="text-center font-bold">
                    أدخل رقم جوال الزبون لإرسال تفاصيل الكرت إليه عبر رسالة نصية (SMS).
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-6">
                <div className="space-y-2">
                    <Label htmlFor="sms-phone" className="text-[10px] font-black text-muted-foreground pr-1 uppercase tracking-widest">رقم جوال الزبون</Label>
                    <Input 
                        id="sms-phone"
                        placeholder="7xxxxxxxx" 
                        type="tel" 
                        value={smsRecipient} 
                        onChange={e => setSmsRecipient(e.target.value.replace(/\D/g, '').slice(0, 9))} 
                        className="text-center text-2xl font-black h-14 rounded-2xl border-2 focus-visible:ring-primary tracking-widest text-foreground bg-muted/20 border-none" 
                    />
                </div>
            </div>
            <DialogFooter className="grid grid-cols-2 gap-3">
                <Button onClick={handleSendSms} className="w-full h-12 rounded-2xl font-black text-base shadow-lg" disabled={!smsRecipient || smsRecipient.length < 9}>إرسال الآن</Button>
                <Button variant="outline" className="w-full h-12 rounded-2xl font-black text-base mt-0" onClick={() => setIsSmsDialogOpen(false)}>إلغاء</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {isProcessing && <ProcessingOverlay message="جاري معالجة طلبك..." />}
      <Toaster />
    </>
  );
}
