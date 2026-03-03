'use client';

import React, { useState, useMemo, useRef } from 'react';
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
  X
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
import { Skeleton } from '@/components/ui/skeleton';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export const dynamic = 'force-dynamic';

// Types
type LocalNetwork = {
    id: string;
    name: string;
    location: string;
    phoneNumber?: string;
    ownerId: string;
};

type CardCategory = {
    id: string | number;
    name: string;
    price: number;
    capacity?: string; // Used by local networks
    validity?: string;
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
        <path
          d="M15 25 A10 10 0 0 0 35 25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M40 15 A15 15 0 0 1 40 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-30"
        />
      </svg>
    </div>
  </div>
);

export default function LocalServicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Popup States
  const [selectedNetwork, setSelectedNetwork] = useState<LocalNetwork | null>(null);
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
  const { data: localNetworks, isLoading: isLoadingLocal } = useCollection<LocalNetwork>(localNetworksQuery);

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
        ? query(
            collection(firestore, 'users', user.uid, 'favorites'),
            where('favoriteType', '==', 'Network'),
            where('isLocal', '==', true)
          )
        : null,
    [firestore, user]
  );
  const { data: favorites } = useCollection<Favorite>(favoritesQuery);
  const favoriteNetworkIds = useMemo(() => new Set(favorites?.map(f => f.targetId)), [favorites]);

  const filteredNetworks = useMemo(() => {
    if (!localNetworks) return [];
    return localNetworks.filter(net => 
      net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      net.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [localNetworks, searchTerm]);

  const handleNetworkClick = async (network: LocalNetwork) => {
    setSelectedNetwork(network);
    setCategories([]);
    setIsLoadingCategories(true);
    setCategoryError(null);
    setPurchasedCard(null);

    try {
      if (firestore) {
        const catsRef = collection(firestore, `networks/${network.id}/cardCategories`);
        const snapshot = await getDocs(catsRef);
        const catsData = snapshot.docs.map(d => ({ 
            id: d.id, 
            ...d.data() 
        } as CardCategory));
        setCategories(catsData);
      }
    } catch (err: any) {
      setCategoryError(err.message || 'حدث خطأ أثناء جلب الفئات');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent, network: LocalNetwork) => {
    e.preventDefault(); e.stopPropagation();
    if (!user || !firestore) return;

    const isFavorited = favoriteNetworkIds.has(network.id);
    const favoritesCollectionRef = collection(firestore, 'users', user.uid, 'favorites');

    if (isFavorited) {
      const favToDelete = favorites?.find(f => f.targetId === network.id);
      if (favToDelete) deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'favorites', favToDelete.id));
      toast({ title: 'تمت الإزالة', description: `تمت إزالة "${network.name}" من المفضلة.` });
    } else {
      addDocumentNonBlocking(favoritesCollectionRef, {
        userId: user.uid,
        targetId: network.id,
        name: network.name,
        location: network.location || 'غير محدد',
        favoriteType: 'Network',
        isLocal: true,
        phoneNumber: network.phoneNumber || ''
      });
      toast({ title: 'تمت الإضافة', description: `تمت إضافة "${network.name}" إلى المفضلة.` });
    }
  };

  const handlePurchase = async () => {
    const selectedCategory = showConfirmPurchase;
    if (!selectedCategory || !selectedNetwork || !user || !userProfile || !firestore || !userDocRef) return;

    setIsProcessing(true);
    const categoryPrice = selectedCategory.price;
    const userBalance = userProfile?.balance ?? 0;

    if (userBalance < categoryPrice) {
        toast({ variant: "destructive", title: "رصيد غير كافٍ", description: "رصيدك الحالي لا يكفي للإتمام." });
        setIsProcessing(false);
        return;
    }

    try {
        const now = new Date().toISOString();
        const batch = writeBatch(firestore);
        const cardsRef = collection(firestore, `networks/${selectedNetwork.id}/cards`);
        const q = query(cardsRef, where('categoryId', '==', selectedCategory.id), where('status', '==', 'available'), firestoreLimit(1));
        const availableCardsSnapshot = await getDocs(q);

        if (availableCardsSnapshot.empty) throw new Error('لا توجد كروت متاحة حالياً.');

        const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
        const cardData = cardToPurchaseDoc.data();
        const ownerId = selectedNetwork.ownerId!;
        const commission = Math.floor(categoryPrice * 0.10);
        const payoutAmount = categoryPrice - commission;

        batch.update(cardToPurchaseDoc.ref, { status: 'sold', soldTo: user.uid, soldTimestamp: now });
        batch.update(userDocRef, { balance: increment(-categoryPrice) });
        batch.update(doc(firestore, 'users', ownerId), { balance: increment(payoutAmount) });

        const buyerTxRef = doc(collection(firestore, `users/${user.uid}/transactions`));
        batch.set(buyerTxRef, {
            userId: user.uid, transactionDate: now, amount: categoryPrice,
            transactionType: `شراء كرت ${selectedCategory.name}`, notes: `شبكة: ${selectedNetwork.name}`,
            cardNumber: cardData.cardNumber,
        });
        
        const ownerTxRef = doc(collection(firestore, `users/${ownerId}/transactions`));
        batch.set(ownerTxRef, {
            userId: ownerId, transactionDate: now, amount: payoutAmount,
            transactionType: 'أرباح بيع كرت', notes: `بيع كرت ${selectedCategory.name} للمشتري ${userProfile.displayName}`,
        });
        
        const soldCardRef = doc(collection(firestore, 'soldCards'));
        batch.set(soldCardRef, {
            networkId: selectedNetwork.id, ownerId, networkName: selectedNetwork.name,
            categoryId: selectedCategory.id, categoryName: selectedCategory.name,
            cardId: cardToPurchaseDoc.id, cardNumber: cardData.cardNumber,
            price: categoryPrice, commissionAmount: commission, payoutAmount,
            buyerId: user.uid, buyerName: userProfile.displayName,
            buyerPhoneNumber: userProfile.phoneNumber || '', soldTimestamp: now, payoutStatus: 'completed'
        });

        await batch.commit();
        setPurchasedCard({ cardID: cardData.cardNumber });
        setShowConfirmPurchase(null);
        setSelectedNetwork(null);
        audioRef.current?.play().catch(() => {});
    } catch (error: any) {
        toast({ variant: "destructive", title: "فشل الشراء", description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background text-foreground">
        <SimpleHeader title="الشبكات المحلية" />
        <div className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text" placeholder="البحث في الشبكات المحلية..."
              className="w-full pr-10 rounded-xl h-12"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {isLoadingLocal ? (
            <div className="flex flex-col items-center justify-center py-20"><CustomLoader /></div>
          ) : filteredNetworks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Wifi className="mx-auto h-16 w-16 opacity-20" /><p className="mt-4 font-bold">لا توجد شبكات محلية</p></div>
          ) : (
            filteredNetworks.map((network, index) => (
              <Card 
                key={network.id} 
                className="bg-mesh-gradient cursor-pointer text-white hover:opacity-90 transition-all rounded-2xl animate-in fade-in-0 slide-in-from-bottom-2 border-none shadow-md"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => handleNetworkClick(network)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="p-3 bg-white/20 rounded-xl"><Wifi className="h-6 w-6 text-white" /></div>
                  <div className="flex-1 text-right mx-4 space-y-1 text-white">
                    <h4 className="font-bold text-base text-white">{network.name}</h4>
                    <p className="text-[10px] opacity-80 text-white/80">{network.location}</p>
                  </div>
                  <button onClick={(e) => handleFavoriteClick(e, network)} className="p-2 hover:scale-110 transition-transform">
                    <Heart className={cn("h-6 w-6 text-white", favoriteNetworkIds.has(network.id) && 'fill-white')} />
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
              <div className="bg-mesh-gradient p-6 text-white relative">
                <div className="flex flex-col items-center text-center gap-2 mt-2">
                  <div className="bg-white/20 p-4 rounded-full border-2 border-white/30 backdrop-blur-md shadow-xl"><Wifi className="h-10 w-10 text-white" /></div>
                  <h2 className="text-xl font-black text-white mt-2">{selectedNetwork.name}</h2>
                  <p className="text-xs opacity-80 text-white/80">{selectedNetwork.location}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-background">
                {isLoadingCategories ? (
                  <div className="flex flex-col items-center justify-center py-10"><CustomLoader /></div>
                ) : categoryError ? (
                  <div className="text-center py-10 space-y-2"><AlertCircle className="h-10 w-10 mx-auto text-destructive" /><p className="text-sm font-bold">{categoryError}</p></div>
                ) : categories.length === 0 ? (
                  <p className="text-center py-10 text-muted-foreground">لا توجد فئات متاحة.</p>
                ) : (
                  <div className="space-y-3">
                    {categories.map((cat) => (
                      <Card key={cat.id} className="rounded-2xl border-none shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowConfirmPurchase(cat)}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 text-right space-y-1">
                            <h4 className="font-bold text-sm text-foreground">{cat.name}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                {cat.capacity && <span className="flex items-center gap-1"><Database className="h-3 w-3" />{cat.capacity}</span>}
                                {cat.validity && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{cat.validity}</span>}
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
              <div className="p-4 bg-background border-t"><Button variant="outline" className="w-full rounded-2xl h-12 font-bold" onClick={() => setSelectedNetwork(null)}>إغلاق</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[28px] max-w-sm text-center bg-white dark:bg-slate-900">
          <DialogHeader><DialogTitle>تأكيد الشراء</DialogTitle><DialogDescription>هل أنت متأكد من شراء كرت "{showConfirmPurchase?.name}"؟</DialogDescription></DialogHeader>
          <div className="py-4 bg-muted/50 rounded-2xl space-y-2"><p className="text-xs text-muted-foreground">سيتم خصم المبلغ من رصيدك</p><p className="text-2xl font-black text-primary">{showConfirmPurchase?.price.toLocaleString()} ريال</p></div>
          <DialogFooter className="grid grid-cols-2 gap-2"><Button className="w-full rounded-xl" onClick={handlePurchase} disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : 'تأكيد'}</Button><Button variant="outline" className="w-full rounded-xl mt-0" onClick={() => setShowConfirmPurchase(null)}>إلغاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {purchasedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in-0">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-background">
                <div className="bg-green-500 p-8 flex justify-center"><div className="bg-white/20 p-4 rounded-full animate-bounce"><CheckCircle className="h-16 w-16 text-white" /></div></div>
                <CardContent className="p-8 space-y-6">
                    <div><h2 className="text-2xl font-black text-green-600">تم الشراء بنجاح!</h2><p className="text-sm text-muted-foreground mt-1">احتفظ برقم الكرت جيداً</p></div>
                    <div className="p-6 bg-muted rounded-[24px] border-2 border-dashed border-primary/20 space-y-3"><p className="text-[10px] font-bold text-primary uppercase tracking-widest">رقم الكرت</p><p className="text-3xl font-black font-mono tracking-tighter text-foreground">{purchasedCard.cardID || purchasedCard.cardNumber}</p></div>
                    <div className="grid grid-cols-2 gap-3"><Button className="rounded-2xl h-12 font-bold" onClick={() => { navigator.clipboard.writeText(purchasedCard.cardID || purchasedCard.cardNumber); toast({ title: "تم النسخ" }); }}><Copy className="ml-2 h-4 w-4" /> نسخ الكرت</Button><Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => setIsSmsDialogOpen(true)}><MessageSquare className="ml-2 h-4 w-4" /> إرسال SMS</Button></div>
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setPurchasedCard(null); setSelectedNetwork(null); }}>إغلاق</Button>
                </CardContent>
            </Card>
        </div>
      )}

      {isProcessing && <ProcessingOverlay message="جاري معالجة طلبك..." />}
      <Toaster />
    </>
  );
}
