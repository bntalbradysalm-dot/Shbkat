'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Zap, 
  Loader2,
  Wallet,
  X,
  Smartphone
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
import { Skeleton } from '@/components/ui/skeleton';
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
import { Separator } from '@/components/ui/separator';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { Label } from '@/components/ui/label';

// Types
type Network = {
  id: number;
  name: string;
  desc: string; 
};

type LocalNetwork = {
    id: string;
    name: string;
    location: string;
    phoneNumber?: string;
    ownerId: string;
};

type CombinedNetwork = {
    id: string;
    name: string;
    location: string;
    phoneNumber?: string;
    isLocal: boolean;
    ownerId?: string;
};

type CardCategory = {
    id: string | number;
    name: string;
    price: number;
    dataLimit?: string;
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

export default function ServicesPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for networks
  const [combinedNetworks, setCombinedNetworks] = useState<CombinedNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const { data: localNetworks, isLoading: isLoadingLocal } = useCollection<LocalNetwork>(localNetworksQuery);

  // User Profile
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const fetchAndCombineNetworks = async () => {
      setIsLoading(true);
      setError(null);
      
      const local: CombinedNetwork[] = (localNetworks || []).map(n => ({
        id: n.id,
        name: n.name,
        location: n.location,
        phoneNumber: n.phoneNumber,
        isLocal: true,
        ownerId: n.ownerId
      }));

      let external: CombinedNetwork[] = [];
      try {
        const response = await fetch('/services/networks-api');
        if (response.ok) {
          const data: Network[] = await response.json();
          external = data.map(n => ({
            id: String(n.id),
            name: n.name,
            location: n.desc || 'غير محدد',
            isLocal: false,
          }));
        }
      } catch (err) {
        console.error('Error fetching external networks:', err);
      }
      
      setCombinedNetworks([...external, ...local]);
      setIsLoading(false);
    };

    if (!isLoadingLocal) {
        fetchAndCombineNetworks();
    }
  }, [localNetworks, isLoadingLocal]);

  // Favorites
  const favoritesQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'favorites'),
            where('favoriteType', '==', 'Network')
          )
        : null,
    [firestore, user]
  );
  const { data: favorites } = useCollection<Favorite>(favoritesQuery);
  const favoriteNetworkIds = useMemo(() => new Set(favorites?.map(f => f.targetId)), [favorites]);

  const filteredNetworks = useMemo(() => {
    return combinedNetworks.filter(net => 
      net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      net.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [combinedNetworks, searchTerm]);

  // Handle network click to open popup
  const handleNetworkClick = async (network: CombinedNetwork) => {
    setSelectedNetwork(network);
    setCategories([]);
    setIsLoadingCategories(true);
    setCategoryError(null);
    setPurchasedCard(null);

    try {
      if (network.isLocal) {
        const catsRef = collection(firestore, `networks/${network.id}/cardCategories`);
        const snapshot = await getDocs(catsRef);
        const catsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CardCategory));
        setCategories(catsData);
      } else {
        const response = await fetch(`/services/networks-api/${network.id}/classes`);
        if (!response.ok) throw new Error('فشل تحميل الفئات الخارجية');
        const data = await response.json();
        // External API mapping
        setCategories(data.map((c: any) => ({
            id: c.id,
            name: c.name,
            price: c.price,
            dataLimit: c.dataLimit,
            expirationDate: c.expirationDate
        })));
      }
    } catch (err: any) {
      setCategoryError(err.message || 'حدث خطأ أثناء جلب الفئات');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent, network: CombinedNetwork) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'يجب تسجيل الدخول لاستخدام المفضلة.' });
      return;
    }

    const networkIdAsString = String(network.id);
    const isFavorited = favoriteNetworkIds.has(networkIdAsString);
    const favoritesCollectionRef = collection(firestore, 'users', user.uid, 'favorites');

    if (isFavorited) {
      const favToDelete = favorites?.find(f => f.targetId === networkIdAsString);
      if (favToDelete) {
        deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'favorites', favToDelete.id));
        toast({ title: 'تمت الإزالة', description: `تمت إزالة "${network.name}" من المفضلة.` });
      }
    } else {
      const favoriteData: any = {
        userId: user.uid,
        targetId: networkIdAsString,
        name: network.name,
        location: network.location || 'غير محدد',
        favoriteType: 'Network',
        isLocal: network.isLocal
      };
      if (network.isLocal && network.phoneNumber) favoriteData.phoneNumber = network.phoneNumber;
      addDocumentNonBlocking(favoritesCollectionRef, favoriteData);
      toast({ title: 'تمت الإضافة', description: `تمت إضافة "${network.name}" إلى المفضلة.` });
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
            // Local Purchase Logic
            const cardsRef = collection(firestore, `networks/${selectedNetwork.id}/cards`);
            const q = query(cardsRef, where('categoryId', '==', selectedCategory.id), where('status', '==', 'available'), firestoreLimit(1));
            const availableCardsSnapshot = await getDocs(q);

            if (availableCardsSnapshot.empty) throw new Error('لا توجد كروت متاحة في هذه الفئة حالياً.');

            const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
            const cardData = cardToPurchaseDoc.data();
            const ownerId = selectedNetwork.ownerId!;
            const commission = categoryPrice * 0.10;
            const payoutAmount = categoryPrice - commission;

            batch.update(cardToPurchaseDoc.ref, { status: 'sold', soldTo: user.uid, soldTimestamp: now });
            batch.update(userDocRef, { balance: increment(-categoryPrice) });
            batch.update(doc(firestore, 'users', ownerId), { balance: increment(payoutAmount) });

            // Logs
            batch.set(doc(collection(firestore, `users/${user.uid}/transactions`)), {
                userId: user.uid, transactionDate: now, amount: categoryPrice,
                transactionType: `شراء كرت ${selectedCategory.name}`, notes: `شبكة: ${selectedNetwork.name}`,
                cardNumber: cardData.cardNumber,
            });
            batch.set(doc(collection(firestore, `users/${ownerId}/transactions`)), {
                userId: ownerId, transactionDate: now, amount: payoutAmount,
                transactionType: 'أرباح بيع كرت', notes: `بيع كرت ${selectedCategory.name} للمشتري ${userProfile.displayName}`,
            });
            batch.set(doc(collection(firestore, 'soldCards')), {
                networkId: selectedNetwork.id, ownerId, networkName: selectedNetwork.name,
                categoryId: selectedCategory.id, categoryName: selectedCategory.name,
                cardId: cardToPurchaseDoc.id, cardNumber: cardData.cardNumber,
                price: categoryPrice, commissionAmount: commission, payoutAmount,
                buyerId: user.uid, buyerName: userProfile.displayName,
                buyerPhoneNumber: userProfile.phoneNumber, soldTimestamp: now, payoutStatus: 'completed'
            });

            await batch.commit();
            setPurchasedCard({ cardID: cardData.cardNumber });
            setShowConfirmPurchase(null);
        } else {
            // External Purchase Logic
            const response = await fetch(`/services/networks-api/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: selectedCategory.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error?.message?.ar || errorData?.message || 'فشل إنشاء الطلب.');
            }

            const result = await response.json();
            const cardData = result.data.order.card;

            batch.update(userDocRef, { balance: increment(-categoryPrice) });
            batch.set(doc(collection(firestore, `users/${user.uid}/transactions`)), {
                userId: user.uid, transactionDate: now, amount: categoryPrice,
                transactionType: `شراء كرت ${selectedCategory.name}`, notes: `شبكة: ${selectedNetwork.name}`,
                cardNumber: cardData.cardID,
            });

            await batch.commit();
            setPurchasedCard(cardData);
            setShowConfirmPurchase(null);
        }
        
        audioRef.current?.play().catch(() => {});
    } catch (error: any) {
        console.error("Purchase failed:", error);
        toast({ variant: "destructive", title: "فشلت عملية الشراء", description: error.message || "حدث خطأ غير متوقع." });
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
        <SimpleHeader title="الشبكات" />
        <div className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="البحث باسم الشبكة أو الموقع..."
              className="w-full pr-10 rounded-xl h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse"><div className="flex gap-4"><Skeleton className="h-12 w-12 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div></Card>
            ))
          ) : filteredNetworks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Wifi className="mx-auto h-16 w-16 opacity-20" /><p className="mt-4 font-bold">لا توجد شبكات متاحة</p></div>
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
                  <div className="flex-1 text-right mx-4 space-y-1">
                    <h4 className="font-bold text-base text-white">{network.name}</h4>
                    <p className="text-[10px] opacity-80 text-white/80">{network.location}</p>
                  </div>
                  <button onClick={(e) => handleFavoriteClick(e, network)} className="p-2 hover:scale-110 transition-transform">
                    <Heart className={cn("h-6 w-6 text-white", favoriteNetworkIds.has(String(network.id)) && 'fill-white')} />
                  </button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Network Details Dialog */}
      <Dialog open={!!selectedNetwork} onOpenChange={(open) => !open && !isProcessing && setSelectedNetwork(null)}>
        <DialogContent className="max-w-[95%] sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          {selectedNetwork && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="bg-mesh-gradient p-6 text-white relative">
                <button 
                  onClick={() => setSelectedNetwork(null)}
                  className="absolute left-4 top-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex flex-col items-center text-center gap-2 mt-2">
                  <div className="p-4 bg-white/20 rounded-2xl"><Wifi className="h-10 w-10 text-white" /></div>
                  <h2 className="text-xl font-black text-white">{selectedNetwork.name}</h2>
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[28px] max-w-sm text-center">
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
          <DialogFooter className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowConfirmPurchase(null)}>إلغاء</Button>
            <Button className="flex-1 rounded-xl" onClick={handlePurchase} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : 'تأكيد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Popup */}
      {purchasedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in-0">
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
        <DialogContent className="rounded-[32px] max-w-sm p-6 z-[200]">
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
            <DialogFooter className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => setIsSmsDialogOpen(false)}>إلغاء</Button>
                <Button onClick={handleSendSms} className="flex-1 h-12 rounded-2xl font-bold" disabled={!smsRecipient || smsRecipient.length < 9}>إرسال الآن</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {isProcessing && <ProcessingOverlay message="جاري معالجة طلبك..." />}
      <Toaster />
    </>
  );
}
