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
  Globe
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [activeTypeTab, setActiveTypeTab] = useState('local');
  
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

  const filteredLocal = useMemo(() => {
    if (!localNetworks) return [];
    return localNetworks.filter((net: any) => net.name.toLowerCase().includes(searchTerm.toLowerCase())).map((n: any) => ({ ...n, isLocal: true }));
  }, [localNetworks, searchTerm]);

  const filteredApi = useMemo(() => {
    return apiNetworks.filter(net => net.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [apiNetworks, searchTerm]);

  const handleNetworkClick = async (network: CombinedNetwork) => {
    setSelectedNetwork(network);
    setCategories([]);
    setIsLoadingCategories(true);
    setCategoryError(null);
    setPurchasedCard(null);

    try {
      if (network.isLocal && firestore) {
        const catsRef = collection(firestore, `networks/${network.id}/cardCategories`);
        const snapshot = await getDocs(catsRef);
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
      setCategoryError(err.message || 'حدث خطأ أثناء جلب الفئات');
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
            if (availableCardsSnapshot.empty) throw new Error('لا توجد كروت متاحة حالياً.');
            const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
            const cardData = cardToPurchaseDoc.data();
            const ownerId = selectedNetwork.ownerId!;
            const commission = Math.floor(selectedCategory.price * 0.10);
            const payoutAmount = selectedCategory.price - commission;

            batch.update(cardToPurchaseDoc.ref, { status: 'sold', soldTo: user.uid, soldTimestamp: now });
            batch.update(userDocRef, { balance: increment(-selectedCategory.price) });
            batch.update(doc(firestore, 'users', ownerId), { balance: increment(payoutAmount) });
            batch.set(doc(collection(firestore, `users/${user.uid}/transactions`)), {
                userId: user.uid, transactionDate: now, amount: selectedCategory.price,
                transactionType: `شراء كرت ${selectedCategory.name}`, notes: `شبكة: ${selectedNetwork.name}`,
                cardNumber: cardData.cardNumber,
            });
            await batch.commit();
            setPurchasedCard({ cardID: cardData.cardNumber });
        } else {
            const response = await fetch(`/services/networks-api/order`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: selectedCategory.id })
            });
            if (!response.ok) throw new Error('فشل الطلب من المصدر');
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
        toast({ variant: "destructive", title: "خطأ", description: error.message });
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
        <div className="p-4"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="text" placeholder="البحث في الشبكات..." className="w-full pr-10 rounded-xl h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
        
        <Tabs value={activeTypeTab} onValueChange={setActiveTypeTab} className="px-4">
            <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl bg-muted/50 p-1 mb-4">
                <TabsTrigger value="local" className="rounded-xl font-bold">شبكات محلية</TabsTrigger>
                <TabsTrigger value="api" className="rounded-xl font-bold">شبكات بيتي</TabsTrigger>
            </TabsList>

            <TabsContent value="local" className="space-y-4 pb-4">
                {isLoadingLocal ? <div className="flex flex-col items-center justify-center py-10"><CustomLoader /></div> : filteredLocal.length === 0 ? <p className="text-center py-10 opacity-50">لا توجد شبكات محلية</p> : filteredLocal.map((net, i) => (
                    <Card key={net.id} className="bg-mesh-gradient cursor-pointer text-white rounded-2xl border-none shadow-md" onClick={() => handleNetworkClick(net)}>
                        <CardContent className="p-4 flex items-center justify-between"><div className="p-3 bg-white/20 rounded-xl"><Wifi className="h-6 w-6" /></div><div className="flex-1 text-right mx-4"><h4 className="font-bold">{net.name}</h4><p className="text-[10px] opacity-80">{net.location}</p></div><button onClick={(e) => handleFavoriteClick(e, net)}><Heart className={cn("h-6 w-6 text-white", favoriteNetworkIds.has(net.id) && 'fill-white')} /></button></CardContent>
                    </Card>
                ))}
            </TabsContent>

            <TabsContent value="api" className="space-y-4 pb-4">
                {isLoadingApi ? <div className="flex flex-col items-center justify-center py-10"><CustomLoader /></div> : filteredApi.length === 0 ? <p className="text-center py-10 opacity-50">لا توجد شبكات بيتي</p> : filteredApi.map((net, i) => (
                    <Card key={net.id} className="bg-mesh-gradient cursor-pointer text-white rounded-2xl border-none shadow-md" onClick={() => handleNetworkClick(net)}>
                        <CardContent className="p-4 flex items-center justify-between"><div className="p-3 bg-white/20 rounded-xl"><Globe className="h-6 w-6" /></div><div className="flex-1 text-right mx-4"><h4 className="font-bold">{net.name}</h4><p className="text-[10px] opacity-80">{net.location}</p></div><button onClick={(e) => handleFavoriteClick(e, net)}><Heart className={cn("h-6 w-6 text-white", favoriteNetworkIds.has(net.id) && 'fill-white')} /></button></CardContent>
                    </Card>
                ))}
            </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedNetwork} onOpenChange={(open) => !open && !isProcessing && setSelectedNetwork(null)}>
        <DialogContent className="max-w-[95%] sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden bg-white dark:bg-slate-950">
          {selectedNetwork && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="bg-mesh-gradient p-6 text-white text-center"><div className="bg-white/20 p-4 rounded-full w-16 h-16 mx-auto mb-2"><Wifi className="h-8 w-8" /></div><h2 className="text-xl font-black">{selectedNetwork.name}</h2></div>
              <div className="flex-1 overflow-y-auto p-4">
                {isLoadingCategories ? <div className="flex justify-center py-10"><CustomLoader /></div> : categoryError ? <p className="text-center text-destructive">{categoryError}</p> : (
                  <div className="space-y-3">{categories.map(cat => (
                    <Card key={cat.id} className="rounded-2xl cursor-pointer bg-muted/30" onClick={() => setShowConfirmPurchase(cat)}><CardContent className="p-4 flex justify-between items-center"><div className="text-right space-y-1"><h4 className="font-bold text-sm">{cat.name}</h4><div className="flex gap-2 text-[10px] opacity-60">{cat.capacity && <span>{cat.capacity}</span>}{cat.expirationDate && <span>{cat.expirationDate}</span>}</div></div><div className="text-left"><p className="font-black text-primary">{cat.price.toLocaleString()} ر.ي</p></div></CardContent></Card>
                  ))}</div>
                )}
              </div>
              <div className="p-4 border-t"><Button variant="outline" className="w-full rounded-2xl" onClick={() => setSelectedNetwork(null)}>إغلاق</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[28px] max-w-sm text-center">
          <DialogHeader><DialogTitle>تأكيد الشراء</DialogTitle></DialogHeader>
          <div className="py-4 bg-muted/50 rounded-2xl"><p className="text-2xl font-black text-primary">{showConfirmPurchase?.price.toLocaleString()} ر.ي</p></div>
          <DialogFooter className="grid grid-cols-2 gap-2"><Button className="w-full rounded-xl" onClick={handlePurchase} disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : 'تأكيد'}</Button><Button variant="outline" className="w-full rounded-xl" onClick={() => setShowConfirmPurchase(null)}>إلغاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {purchasedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] border-none bg-background">
                <div className="bg-green-500 p-8 flex justify-center"><CheckCircle className="h-16 w-16 text-white animate-bounce" /></div>
                <CardContent className="p-8 space-y-6">
                    <div><h2 className="text-2xl font-black text-green-600">تم الشراء!</h2><p className="text-3xl font-black font-mono mt-4 tracking-widest">{purchasedCard.cardID || purchasedCard.cardNumber}</p></div>
                    <div className="grid grid-cols-2 gap-3"><Button className="rounded-2xl" onClick={handleCopy}><Copy className="ml-2 h-4 w-4" /> نسخ</Button><Button variant="outline" className="rounded-2xl" onClick={() => setIsSmsDialogOpen(true)}><MessageSquare className="ml-2 h-4 w-4" /> SMS</Button></div>
                    <Button variant="ghost" onClick={() => { setPurchasedCard(null); setSelectedNetwork(null); }}>إغلاق</Button>
                </CardContent>
            </Card>
        </div>
      )}

      {isProcessing && <ProcessingOverlay message="جاري الشراء..." />}
      <Toaster />
    </>
  );
}
