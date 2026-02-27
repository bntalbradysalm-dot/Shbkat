'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  SatelliteDish,
  History,
  Wifi,
  Smartphone,
  ShoppingBag,
  ArrowLeftRight,
  Heart,
  Gamepad2,
  Percent,
  ChevronLeft,
  Sparkles,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Copy,
  MessageSquare,
  X,
  CheckCircle
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
  { name: 'المشتريات', icon: ShoppingBag, href: '/store' },
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
        <span className="text-xs font-bold text-primary text-center px-1">{name}</span>
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
                    
                    const targetPrices = [1000, 1200, 1500];
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
                            const targetPrices = [1000, 1200, 1500];
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
            
            const ownerRef = doc(firestore, 'users', ownerId);
            batch.update(ownerRef, { balance: increment(payoutAmount) });

            const buyerTxRef = doc(collection(firestore, `users/${user.uid}/transactions`));
            batch.set(buyerTxRef, {
                userId: user.uid, 
                transactionDate: now, 
                amount: categoryPrice,
                transactionType: `شراء كرت ${selectedCategory.name}`, 
                notes: `شبكة: ${alKhairNetwork.name}`,
                cardNumber: cardData.cardNumber,
            });
            
            const ownerTxRef = doc(collection(firestore, `users/${ownerId}/transactions`));
            batch.set(ownerTxRef, {
                userId: ownerId, 
                transactionDate: now, 
                amount: payoutAmount,
                transactionType: 'أرباح بيع كرت', 
                notes: `بيع كرت ${selectedCategory.name} للمشتري ${userProfile.displayName || 'مشترك'}`,
            });
            
            const soldCardRef = doc(collection(firestore, 'soldCards'));
            batch.set(soldCardRef, {
                networkId: alKhairNetwork.id, 
                ownerId, 
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
    if (!purchasedCard || !alKhairNetwork || !smsRecipient) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم الزبون.' });
        return;
    }
    const msg = `شبكة: ${alKhairNetwork.name}\nرقم الكرت: ${purchasedCard.cardID || purchasedCard.cardNumber}`;
    window.location.href = `sms:${smsRecipient}?body=${encodeURIComponent(msg)}`;
    setIsSmsDialogOpen(false);
  };

  return (
    <div className="relative bg-background rounded-t-[40px] mt-6 pt-8 pb-4">
      {/* SVG Gradient Definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--icon-grad-start)" />
            <stop offset="100%" stopColor="var(--icon-grad-end)" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="grid grid-cols-3 gap-y-6 gap-x-4 px-6">
        {services.map((service, index) => (
          <ServiceItem 
            key={service.name} 
            {...service} 
            index={index} 
          />
        ))}
      </div>

      {/* Exclusive Offers Bar */}
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

      {/* Offers Modal */}
      <Dialog open={isOffersOpen} onOpenChange={setIsOffersOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[380px] p-0 overflow-hidden rounded-[40px] border-none bg-white dark:bg-slate-950 shadow-2xl flex flex-col z-[9999] outline-none [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>عروض شبكة الخير فورجي</DialogTitle>
            <DialogDescription>استعراض العروض الخاصة لشبكة الخير فورجي</DialogDescription>
          </DialogHeader>
          
          {/* Header Section */}
          <div className="bg-mesh-gradient p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <Sparkles className="absolute top-4 left-4 h-12 w-12 text-white animate-pulse" />
                <Zap className="absolute bottom-4 right-4 h-12 w-12 text-white animate-bounce" />
             </div>
             <Badge className="bg-white/20 text-white border-white/30 mb-2 font-black text-[10px] uppercase tracking-widest px-3">عرض محدود</Badge>
             <h2 className="text-2xl font-black text-white tracking-tight">عرض شبكة الخير</h2>
             <p className="text-white/70 text-xs font-bold mt-1">أقوى باقات الفورجي بأسعار منافسة</p>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {isFetchingOffers ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-muted-foreground">جاري جلب العروض...</p>
                </div>
            ) : specialOffers.length > 0 ? (
                specialOffers.map((offer, idx) => (
                    <Card key={offer.id} className="rounded-3xl border-none shadow-md bg-muted/30 hover:bg-primary/5 transition-all group animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 150}ms` }}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Wifi className="h-6 w-6" />
                                </div>
                                <div className="text-right">
                                    <h4 className="text-sm font-black">{offer.name}</h4>
                                    <p className="text-[10px] font-bold text-muted-foreground">شبكة الخير فورجي</p>
                                </div>
                            </div>
                            <div className="text-left flex flex-col items-end">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-black text-primary">{offer.price.toLocaleString()}</span>
                                    <span className="text-[8px] font-bold text-muted-foreground">ر.ي</span>
                                </div>
                                <Button 
                                    size="sm" 
                                    className="h-7 rounded-lg text-[10px] font-black px-4 mt-1 shadow-lg shadow-primary/20"
                                    onClick={() => handleOfferClick(offer)}
                                >
                                    شراء <ArrowUpRight className="h-3 w-3 mr-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="text-center py-10 opacity-40">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-xs font-bold">لا توجد عروض حالياً للشبكة</p>
                </div>
            )}
          </div>
          
          <div className="p-6 pt-0 mt-auto">
            <Button 
                onClick={() => setIsOffersOpen(false)}
                className="w-full h-12 rounded-2xl bg-mesh-gradient text-white font-black text-base shadow-xl active:scale-95 transition-all border-none"
            >
                إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!showConfirmPurchase} onOpenChange={(open) => !open && setShowConfirmPurchase(null)}>
        <DialogContent className="rounded-[28px] max-w-sm text-center bg-white dark:bg-slate-900 z-[10000]">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4 animate-in fade-in-0">
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
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { setPurchasedCard(null); setAlKhairNetwork(null); }}>إغلاق</Button>
                </CardContent>
            </Card>
        </div>
      )}

      {/* SMS Dialog */}
      <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
        <DialogContent className="rounded-[32px] max-w-sm p-6 z-[10002] bg-white dark:bg-slate-900">
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
    </div>
  );
}
