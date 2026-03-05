
'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  SatelliteDish,
  History,
  Wifi,
  Smartphone,
  MessageCircleQuestion,
  ArrowLeftRight,
  Heart,
  Gamepad2,
  Percent,
  ChevronLeft,
  Sparkles,
  Zap,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Copy,
  MessageSquare,
  X,
  CheckCircle,
  Clock,
  Database,
  Star,
  Trophy,
  Megaphone,
  Globe,
  PhoneCall,
  Phone,
  Signal
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, getDocs, limit, doc, writeBatch, increment, limit as firestoreLimit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type Service = {
  name: string;
  icon: LucideIcon;
  href: string;
};

const services: Service[] = [
  { name: 'تسديد رصيد', icon: Smartphone, href: '/telecom-services' },
  { name: 'الشبكات', icon: Wifi, href: '/services' },
  { name: 'منظومة الوادي', icon: SatelliteDish, href: '/alwadi' },
  { name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
  { name: 'شدات ببجي', icon: Gamepad2, href: '/games' },
  { name: 'المفضلة', icon: Heart, href: '/favorites' },
  { name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
  { name: 'سجل العمليات', icon: History, href: '/transactions' },
  { name: 'الدعم الفني', icon: MessageCircleQuestion, href: '/support' },
];

const telecomShortcuts = [
  { name: 'يمن موبايل', icon: PhoneCall, color: '#B32C4C', bg: 'bg-[#B32C4C]/10', href: '/yemen-mobile' },
  { name: 'يو', icon: Signal, color: '#E6B000', bg: 'bg-[#FECC4F]/20', href: '/you-services' },
  { name: 'يمن فورجي', icon: Zap, color: '#106BA2', bg: 'bg-[#106BA2]/10', href: '/yemen-4g' },
  { name: 'الثابت', icon: Phone, color: '#F18312', bg: 'bg-[#F18312]/10', href: '/internet-landline' },
];

const CARD_GRADIENTS = [
    "from-amber-400 via-amber-500 to-orange-600",
    "from-blue-400 via-blue-500 to-blue-600",
    "from-emerald-400 via-emerald-500 to-emerald-600",
    "from-rose-400 via-rose-500 to-rose-600",
];

const ServiceItem = ({
  name,
  icon: Icon,
  index,
  href,
}: Service & { index: number }) => {
  return (
    <Link href={href}>
      <div className="group flex flex-col items-center justify-start space-y-2 focus:outline-none animate-in fade-in-0 zoom-in-95 cursor-pointer"
        style={{
          paddingTop: '2px',
          animationDelay: `${100 + index * 50}ms`,
          animationFillMode: 'backwards',
        }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card border border-border/50 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
          <Icon 
            className="h-10 w-10 transition-transform group-hover:scale-110" 
            style={{ stroke: 'url(#icon-gradient)' }}
          />
        </div>
        <span className="text-[11px] font-black text-primary text-center px-1 leading-tight">{name}</span>
      </div>
    </Link>
  );
};

export function ServiceGrid() {
  const [isOffersOpen, setIsOffersOpen] = useState(false);
  const firestore = useFirestore();
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [alKhairNetwork, setAlKhairNetwork] = useState<any>(null);
  const [specialOffers, setAlKhairOffers] = useState<any[]>([]);
  const [isFetchingOffers, setIsFetchingOffers] = useState(false);

  // Purchase States
  const [showConfirmPurchase, setShowConfirmPurchase] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<any>(null);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // User Profile
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);

  useEffect(() => {
    if (isOffersOpen) {
        const fetchAlKhairOffers = async () => {
            setIsFetchingOffers(true);
            try {
                const netsResponse = await fetch('/services/networks-api');
                if (!netsResponse.ok) throw new Error('Failed to fetch networks');
                const networks = await netsResponse.json();
                
                const alKhair = networks.find((n: any) => n.name.includes('الخير'));
                
                if (alKhair) {
                    setAlKhairNetwork({ id: alKhair.id, name: alKhair.name, isLocal: false });
                    const classesResponse = await fetch(`/services/networks-api/${alKhair.id}/classes`);
                    if (!classesResponse.ok) throw new Error('Failed to fetch classes');
                    const classes = await classesResponse.json();
                    
                    const targetPrices = [50, 1000, 1500];
                    const filtered = classes.filter((c: any) => targetPrices.includes(Number(c.price)));
                    setAlKhairOffers(filtered.sort((a: any, b: any) => a.price - b.price));
                } else {
                    if (firestore) {
                        const netsRef = collection(firestore, 'networks');
                        const q = query(netsRef, where('name', '>=', 'الخير'), where('name', '<=', 'الخير' + '\uf8ff'), firestoreLimit(1));
                        const snap = await getDocs(q);
                        if (!snap.empty) {
                            const net = { id: snap.docs[0].id, ...snap.docs[0].data() };
                            setAlKhairNetwork({ ...net, isLocal: true });
                            const catsRef = collection(firestore, `networks/${net.id}/cardCategories`);
                            const catsSnap = await getDocs(catsRef);
                            const cats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                            const targetPrices = [50, 1000, 1500];
                            const filtered = cats.filter((c: any) => targetPrices.includes(Number(c.price)));
                            setAlKhairOffers(filtered.sort((a: any, b: any) => a.price - b.price));
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch Al Khair offers:", err);
            } finally {
                setIsFetchingOffers(false);
            }
        };
        fetchAlKhairOffers();
    }
  }, [isOffersOpen, firestore]);

  const handleOfferClick = (offer: any) => {
    setShowConfirmPurchase(offer);
  };

  const handlePurchase = async () => {
    const selectedCategory = showConfirmPurchase;
    if (!selectedCategory || !alKhairNetwork || !user || !userProfile || !firestore || !userDocRef) {
        toast({ variant: "destructive", title: "خطأ", description: "بيانات الشراء غير مكتملة." });
        return;
    }

    setIsProcessing(true);
    const categoryPrice = selectedCategory.price;
    const userBalance = userProfile?.balance ?? 0;

    if (userBalance < categoryPrice) {
        toast({ variant: "destructive", title: "رصيد غير كافٍ", description: "رصيدك الحالي لا يكفي لإتمام عملية الشراء." });
        setIsProcessing(false);
        return;
    }

    try {
        const now = new Date().toISOString();
        const batch = writeBatch(firestore);

        if (alKhairNetwork.isLocal) {
            const cardsRef = collection(firestore, `networks/${alKhairNetwork.id}/cards`);
            const q = query(cardsRef, where('categoryId', '==', selectedCategory.id), where('status', '==', 'available'), firestoreLimit(1));
            const availableCardsSnapshot = await getDocs(q);

            if (availableCardsSnapshot.empty) throw new Error('لا توجد كروت متاحة في هذه الفئة حالياً.');

            const cardToPurchaseDoc = availableCardsSnapshot.docs[0];
            const cardData = cardToPurchaseDoc.data();
            const ownerId = alKhairNetwork.ownerId!;
            const commission = Math.floor(categoryPrice * 0.10);
            const payoutAmount = categoryPrice - commission;

            batch.update(cardToPurchaseDoc.ref, { status: 'sold', soldTo: user.uid, soldTimestamp: now });
            batch.update(userDocRef, { balance: increment(-categoryPrice) });
            
            if (ownerId && ownerId !== 'admin') {
                const ownerDocRef = doc(firestore, 'users', ownerId);
                batch.update(ownerDocRef, { balance: increment(payoutAmount) });
                const ownerTxRef = doc(collection(firestore, `users/${ownerId}/transactions`));
                batch.set(ownerTxRef, {
                    userId: ownerId,
                    transactionDate: now,
                    amount: payoutAmount,
                    transactionType: 'أرباح مبيعات الكروت',
                    notes: `أرباح بيع كرت ${selectedCategory.name} - شبكة: ${alKhairNetwork.name}`
                });
            }
            
            const buyerTxRef = doc(collection(firestore, `users/${user.uid}/transactions`));
            batch.set(buyerTxRef, {
                userId: user.uid, 
                transactionDate: now, 
                amount: categoryPrice,
                transactionType: `شراء كرت ${selectedCategory.name}`, 
                notes: `شبكة: ${alKhairNetwork.name}`,
                cardNumber: cardData.cardNumber,
            });
            
            const soldCardRef = doc(collection(firestore, 'soldCards'));
            batch.set(soldCardRef, {
                networkId: alKhairNetwork.id, 
                ownerId: ownerId || 'admin', 
                networkName: alKhairNetwork.name,
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
                    path: `batch_purchase/${alKhairNetwork.id}`,
                    operation: 'write',
                    requestResourceData: { categoryId: selectedCategory.id }
                });
                errorEmitter.emit('permission-error', permissionError);
                throw err;
            });

            setPurchasedCard({ cardID: cardData.cardNumber });
            setShowConfirmPurchase(null);
            setIsOffersOpen(false);
        } else {
            const response = await fetch(`/services/networks-api/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: selectedCategory.id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.message || 'فشل الشراء\nيرجى التواصل مع الادارة 770326828');
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
                notes: `شبكة: ${alKhairNetwork.name}`,
                cardNumber: cardData.cardID,
            });

            await batch.commit();
            setPurchasedCard(cardData);
            setShowConfirmPurchase(null);
            setIsOffersOpen(false);
        }
        
        audioRef.current?.play().catch(() => {});
    } catch (error: any) {
        console.error("Purchase failed:", error);
        toast({ variant: "destructive", title: "فشل عملية الشراء", description: error.message || 'فشل الشراء\nيرجى التواصل مع الادارة 770326828' });
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
    if (!purchasedCard || !alKhairNetwork || !smsRecipient) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم الزبون.' });
        return;
    }
    const msg = `شبكة: ${alKhairNetwork.name}\nرقم الكرت: ${purchasedCard.cardID || purchasedCard.cardNumber}`;
    window.location.href = `sms:${smsRecipient}?body=${encodeURIComponent(msg)}`;
    setIsSmsDialogOpen(false);
  };

  return (
    <div className="relative bg-background rounded-t-[40px] mt-0 pt-2 pb-4">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--icon-grad-start)" />
            <stop offset="100%" stopColor="var(--icon-grad-end)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Telecom Quick Shortcuts - UPDATED: Smaller, Icons, moved up */}
      <div className="flex justify-around items-center px-6 mb-5 animate-in fade-in-0 slide-in-from-right-4 duration-700">
        {telecomShortcuts.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link href={item.href} key={i} className="flex flex-col items-center gap-1.5 shrink-0 group">
              <div className={cn("w-11 h-11 rounded-full flex items-center justify-center border-2 border-transparent shadow-sm group-hover:shadow-md transition-all active:scale-90", item.bg)}>
                <Icon size={20} color={item.color} className="transition-transform group-hover:scale-110" strokeWidth={2.5} />
              </div>
              <span className="text-[9px] font-black text-foreground">{item.name}</span>
            </Link>
          );
        })}
      </div>
      
      <div className="grid grid-cols-3 gap-y-6 gap-x-4 px-6">
        {services.map((service, index) => (
          <ServiceItem 
            key={service.name} 
            {...service} 
            index={index} 
          />
        ))}
      </div>

      <div className="px-6 mt-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-1000">
        <Card 
          className="overflow-hidden border-none bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer rounded-2xl border border-primary/10 shadow-sm active:scale-95"
          onClick={() => setIsOffersOpen(true)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <Percent className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black text-primary">عروض حصرية</h3>
                <p className="text-[10px] text-muted-foreground font-bold">اطلع على أحدث العروض والخدمات المضافة</p>
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 text-primary/50" />
          </CardContent>
        </Card>
      </div>

      <Dialog open={isOffersOpen} onOpenChange={setIsOffersOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[400px] p-0 overflow-hidden rounded-[40px] border-none bg-[#F8FAFC] dark:bg-slate-950 shadow-2xl flex flex-col z-[9999] outline-none [&>button]:hidden">
          <div className="bg-mesh-gradient p-8 text-center relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
             
             <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 mb-4 shadow-xl">
                    <Megaphone className="h-8 w-8 text-white animate-bounce" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">عروض شبكة الخير</h2>
                <p className="text-white/80 text-xs font-bold mt-1.5 bg-white/10 py-1 px-4 rounded-full border border-white/5">أقوى باقات شبكة الخير فورجي</p>
             </div>
          </div>

          <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto no-scrollbar">
            {isFetchingOffers ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                        <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                    </div>
                    <p className="text-sm font-black text-primary animate-pulse tracking-widest">جاري تحميل العروض الحصرية...</p>
                </div>
            ) : specialOffers.length > 0 ? (
                specialOffers.map((offer, idx) => {
                    const priceNum = Number(offer.price);
                    const dataInfo = priceNum === 50 ? '5 قيقا' : priceNum === 1000 ? '15 قيقا' : priceNum === 1500 ? '25 قيقا' : '';
                    const durationInfo = priceNum === 50 ? 'ساعة واحدة' : 'صلاحية 30 يوم';
                    const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
                    
                    const offerTitle = priceNum === 50 ? 'فئة 50 ريال' : 
                                     priceNum === 1000 ? 'فئة 1000 ريال' : 
                                     priceNum === 1500 ? 'فئة 1500 ريال' : offer.name;
                    
                    return (
                        <div 
                            key={offer.id} 
                            className="animate-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both"
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            <Card 
                                className={cn(
                                    "relative overflow-hidden rounded-[28px] border-none shadow-xl transition-all duration-300 group cursor-pointer active:scale-[0.97]",
                                    "bg-gradient-to-br p-[2px]",
                                    gradient
                                )}
                                onClick={() => handleOfferClick(offer)}
                            >
                                <div className="relative rounded-[26px] p-3.5 flex items-center justify-between gap-4 h-full transition-colors bg-white/95 dark:bg-slate-900/95 hover:bg-primary/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-11 w-11 rounded-[18px] flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-br text-white",
                                            gradient
                                        )}>
                                            <Wifi className="h-5 w-5" />
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <h4 className="text-xs font-black text-foreground group-hover:text-primary transition-colors">{offerTitle}</h4>
                                            <div className="flex gap-2.5 mt-1">
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-primary">
                                                    <Database className="h-2.5 w-2.5" />
                                                    <span>{dataInfo}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    <span>{durationInfo}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex flex-col items-end leading-tight">
                                            <span className="text-xl font-black tracking-tighter text-primary">
                                                {offer.price.toLocaleString('en-US')}
                                            </span>
                                            <span className="text-[7px] font-black text-muted-foreground uppercase opacity-60">ريال</span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            className="h-7 rounded-lg text-[9px] font-black px-4 bg-primary shadow-md shadow-primary/20 active:scale-95 transition-all"
                                        >
                                            شراء
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    );
                })
            ) : (
                <div className="text-center py-16 opacity-40">
                    <div className="bg-muted/50 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-black text-muted-foreground">عفواً.. لا توجد عروض حالياً</p>
                </div>
            )}
          </div>
          
          <div className="p-6 pt-2 mt-auto">
            <Button 
                onClick={() => setIsOffersOpen(false)}
                className="w-full h-12 rounded-2xl bg-mesh-gradient text-white font-black text-base shadow-xl active:scale-95 transition-all border-none"
            >
                إغلاق النافذة
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[32px] max-sm text-center bg-white dark:bg-slate-900 z-[10000] border-none shadow-2xl outline-none">
          <DialogHeader>
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-center font-black text-xl">تأكيد عملية الشراء</DialogTitle>
            <DialogDescription className="text-center font-bold">
              هل أنت متأكد من شراء كرت <span className="text-primary">"{showConfirmPurchase?.name}"</span>؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 bg-muted/30 rounded-[28px] border-2 border-dashed border-primary/10 space-y-2 mt-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">سيتم خصم المبلغ من رصيدك</p>
            <p className="text-3xl font-black text-primary">{showConfirmPurchase?.price.toLocaleString('en-US')} <span className="text-sm">ريال</span></p>
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
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-background">
                <CardContent className="p-8 space-y-6">
                    <div>
                        <div className="bg-green-500 p-8 flex justify-center mb-4 rounded-t-[40px] -m-8">
                            <div className="bg-white/20 p-4 rounded-full animate-bounce">
                                <CheckCircle className="h-16 w-16 text-white" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-green-600 mt-4">تم الشراء بنجاح!</h2>
                        <p className="text-sm text-muted-foreground mt-1">احتفظ برقم الكرت جيداً</p>
                    </div>
                    
                    <div className="p-6 bg-muted rounded-[24px] border-2 border-dashed border-primary/20 space-y-3">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">رقم الكرت</p>
                        <p className="text-3xl font-black font-mono tracking-tighter text-foreground">
                            {purchasedCard.cardID || purchasedCard.cardNumber}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <Button className="rounded-2xl h-12 font-black" onClick={handleCopy}>
                            <Copy className="ml-2 h-4 w-4" /> نسخ الكرت
                        </Button>
                        <Button variant="outline" className="rounded-2xl h-12 font-black" onClick={() => setIsSmsDialogOpen(true)}>
                            <MessageSquare className="ml-2 h-4 w-4" /> ارسال SMS
                        </Button>
                    </div>
                    <Button variant="ghost" className="w-full text-muted-foreground font-bold" onClick={() => { setPurchasedCard(null); setAlKhairNetwork(null); }}>إغلاق</Button>
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
                        placeholder="73xxxxxxx" 
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
    </div>
  );
}
