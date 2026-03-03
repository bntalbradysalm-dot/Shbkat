
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Globe, 
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
  Wifi,
  Clock
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
import { collection, query, where, doc, writeBatch, increment, getDocs, limit as firestoreLimit } from 'firebase/firestore';
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

export const dynamic = 'force-dynamic';

// Types
type Network = {
  id: number;
  name: string;
  desc: string; 
};

type CombinedNetwork = {
    id: string;
    name: string;
    location: string;
    isLocal: boolean;
};

type CardCategory = {
    id: string | number;
    name: string;
    price: number;
    dataLimit?: string;
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

export default function BaityNetworksPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [networks, setNetworks] = useState<CombinedNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    const fetchNetworks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/services/networks-api');
        if (response.ok) {
          const data: Network[] = await response.json();
          setNetworks(data.map(n => ({
            id: String(n.id),
            name: n.name,
            location: n.desc || 'شبكة API',
            isLocal: false,
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNetworks();
  }, []);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const favoritesQuery = useMemoFirebase(
    () => user && firestore ? query(collection(firestore, 'users', user.uid, 'favorites'), where('isLocal', '==', false)) : null,
    [firestore, user]
  );
  const { data: favorites } = useCollection<Favorite>(favoritesQuery);
  const favoriteNetworkIds = useMemo(() => new Set(favorites?.map(f => f.targetId)), [favorites]);

  const filteredNetworks = useMemo(() => {
    return networks.filter(net => net.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [networks, searchTerm]);

  const handleNetworkClick = async (network: CombinedNetwork) => {
    setSelectedNetwork(network);
    setCategories([]);
    setIsLoadingCategories(true);
    setCategoryError(null);
    setPurchasedCard(null);

    try {
      const response = await fetch(`/services/networks-api/${network.id}/classes`);
      if (!response.ok) throw new Error('فشل تحميل الفئات');
      const data = await response.json();
      setCategories(data.map((c: any) => ({
          id: c.id, name: c.name, price: c.price, dataLimit: c.dataLimit, expirationDate: c.expirationDate
      })));
    } catch (err: any) {
      setCategoryError(err.message);
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
        userId: user.uid, targetId: network.id, name: network.name, location: network.location, favoriteType: 'Network', isLocal: false
      });
    }
  };

  const handlePurchase = async () => {
    const selectedCategory = showConfirmPurchase;
    if (!selectedCategory || !user || !userProfile || !firestore || !userDocRef) return;
    
    setIsProcessing(true);
    try {
        const response = await fetch(`/services/networks-api/order`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: selectedCategory.id })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل تنفيذ الطلب من المصدر');
        }
        
        const result = await response.json();
        const cardData = result.data.order.card;
        
        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(-selectedCategory.price) });
        
        const transactionPayload: any = {
            userId: user.uid, 
            transactionDate: new Date().toISOString(), 
            amount: selectedCategory.price,
            transactionType: `شراء كرت ${selectedCategory.name}`, 
            notes: `شبكة بيتي: ${selectedNetwork?.name}`,
            cardNumber: cardData.cardID,
        };
        
        if (cardData.cardPass && cardData.cardPass !== cardData.cardID) {
            transactionPayload.cardPassword = cardData.cardPass;
        }

        batch.set(doc(collection(firestore, `users/${user.uid}/transactions`)), transactionPayload);
        await batch.commit();
        
        setPurchasedCard(cardData);
        setShowConfirmPurchase(null);
        audioRef.current?.play().catch(() => {});
    } catch (error: any) {
        toast({ variant: "destructive", title: "خطأ", description: error.message });
    } finally { 
        setIsProcessing(false); 
    }
  };

  const handleCopy = () => {
    if (purchasedCard) {
        navigator.clipboard.writeText(purchasedCard.cardID);
        toast({ title: "تم النسخ" });
    }
  };

  const handleSendSms = () => {
    if (!purchasedCard || !selectedNetwork || !smsRecipient) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم الزبون.' });
        return;
    }
    const cardInfo = purchasedCard.cardID;
    const passInfo = purchasedCard.cardPass && purchasedCard.cardPass !== cardInfo ? `\nكلمة المرور: ${purchasedCard.cardPass}` : '';
    const msg = `شبكة: ${selectedNetwork.name}\nرقم الكرت: ${cardInfo}${passInfo}`;
    window.location.href = `sms:${smsRecipient}?body=${encodeURIComponent(msg)}`;
    setIsSmsDialogOpen(false);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-background text-foreground">
        <SimpleHeader title="شبكات بيتي" />
        <div className="p-4"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><Input type="text" placeholder="البحث في شبكات بيتي..." className="w-full pr-10 rounded-xl h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {isLoading ? ( <div className="flex flex-col items-center justify-center py-20"><CustomLoader /></div> ) : filteredNetworks.length === 0 ? ( <div className="text-center py-16 text-muted-foreground"><Globe className="mx-auto h-16 w-16 opacity-20" /><p className="mt-4 font-bold">لا توجد شبكات</p></div> ) : (
            filteredNetworks.map((network, index) => (
              <Card key={network.id} className="bg-mesh-gradient cursor-pointer text-white hover:opacity-90 transition-all rounded-2xl animate-in fade-in-0 slide-in-from-bottom-2 border-none shadow-md" style={{ animationDelay: `${index * 30}ms` }} onClick={() => handleNetworkClick(network)}>
                <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div className="p-3 bg-white/20 rounded-xl shrink-0 backdrop-blur-sm border border-white/10">
                        <Wifi className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 text-right mx-2 space-y-0.5 overflow-hidden">
                        <h4 className="font-black text-base text-white truncate">{network.name}</h4>
                        <p className="text-[10px] text-white/70 font-bold truncate opacity-80">{network.location}</p>
                    </div>
                    <button onClick={(e) => handleFavoriteClick(e, network)} className="p-2.5 hover:scale-110 transition-transform bg-white/10 rounded-full shrink-0">
                        <Heart className={cn("h-5 w-5 text-white", favoriteNetworkIds.has(network.id) && 'fill-white')} />
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
              <div className="bg-mesh-gradient pt-14 pb-10 px-8 text-white text-center relative overflow-hidden">
                <DialogHeader className="p-0 space-y-0 mb-4">
                    <DialogTitle className="sr-only">تفاصيل شبكة بيتي</DialogTitle>
                    <DialogDescription className="sr-only">استعراض فئات الكروت لشبكات بيتي</DialogDescription>
                    <div className="bg-white/20 p-4 rounded-full w-16 h-16 mx-auto mb-3 backdrop-blur-md border border-white/20">
                        <Wifi className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-black text-white">{selectedNetwork.name}</h2>
                    <p className="text-xs text-white/70 font-bold mt-1">{selectedNetwork.location}</p>
                </DialogHeader>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
                {isLoadingCategories ? ( <div className="flex justify-center py-10"><CustomLoader /></div> ) : categoryError ? ( <div className="text-center py-10 space-y-2"><AlertCircle className="h-10 w-10 mx-auto text-destructive" /><p className="text-sm font-bold">{categoryError}</p></div> ) : (
                  <div className="space-y-3">{categories.map((cat) => ( <Card key={cat.id} className="rounded-2xl border-none shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowConfirmPurchase(cat)}><CardContent className="p-4 flex items-center justify-between"><div className="flex-1 text-right space-y-1"><h4 className="font-black text-sm text-foreground">{cat.name}</h4><div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">{cat.dataLimit && <span className="flex items-center gap-1"><Database className="h-3 w-3" />{cat.dataLimit}</span>}{cat.expirationDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{cat.expirationDate}</span>}</div></div><div className="text-left"><p className="font-black text-primary text-lg">{cat.price.toLocaleString()} ر.ي</p></div></CardContent></Card> ))}</div>
                )}
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border-t"><Button variant="outline" className="w-full rounded-2xl h-12 font-black" onClick={() => setSelectedNetwork(null)}>إغلاق</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[32px] max-sm text-center bg-white dark:bg-slate-900 z-[10000] border-none shadow-2xl outline-none">
          <DialogHeader>
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-center font-black text-xl">تأكيد الشراء</DialogTitle>
            <DialogDescription className="text-center font-bold">هل أنت متأكد من شراء كرت <span className="text-primary">"{showConfirmPurchase?.name}"</span>؟</DialogDescription>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4 animate-in fade-in-0">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <Card className="w-full max-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-background">
                <DialogHeader className="sr-only">
                    <DialogTitle>تم الشراء بنجاح</DialogTitle>
                    <DialogDescription>تفاصيل الكرت الذي تم شراؤه لشبكات بيتي</DialogDescription>
                </DialogHeader>
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
                        <p className="text-3xl font-black font-mono tracking-tighter text-foreground">{purchasedCard.cardID}</p>
                        {purchasedCard.cardPass && purchasedCard.cardPass !== purchasedCard.cardID && (
                            <div className="mt-2 pt-2 border-t border-dashed border-primary/10">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">كلمة المرور</p>
                                <p className="text-xl font-black font-mono text-foreground">{purchasedCard.cardPass}</p>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Button className="rounded-2xl h-12 font-bold" onClick={handleCopy}>
                            <Copy className="ml-2 h-4 w-4" /> نسخ الكرت
                        </Button>
                        <Button variant="outline" className="rounded-2xl h-12 font-black" onClick={() => setIsSmsDialogOpen(true)}>
                            <MessageSquare className="ml-2 h-4 w-4" /> ارسال SMS
                        </Button>
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
                <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="text-primary h-6 w-6" />
                </div>
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
