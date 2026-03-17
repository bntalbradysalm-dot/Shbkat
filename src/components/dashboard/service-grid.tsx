
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
  Sparkles,
  Zap,
  Gift,
  CheckCircle,
  Loader2,
  X,
  CreditCard,
  Database,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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

const ServiceItem = ({
  name,
  icon: Icon,
  index,
  href,
}: Service & { index: number }) => {
  return (
    <Link href={href} className="w-full">
      <div 
        className="group flex flex-col items-center justify-center bg-white dark:bg-slate-900 aspect-[1.1/1] rounded-[28px] shadow-sm border border-border/40 hover:shadow-md transition-all duration-300 active:scale-95 animate-in fade-in-0 zoom-in-95"
        style={{
          animationDelay: `${100 + index * 50}ms`,
          animationFillMode: 'backwards',
        }}
      >
        <div className="mb-1.5">
          <Icon 
            className="h-8 w-8 transition-transform group-hover:scale-110" 
            style={{ 
                strokeWidth: 2,
                stroke: 'url(#icon-gradient)'
            }}
          />
        </div>
        <span className="text-[10px] font-black text-foreground text-center px-1 leading-tight">{name}</span>
      </div>
    </Link>
  );
};

export function ServiceGrid() {
  const [isEidOfferOpen, setIsEidOfferOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchasedCard, setPurchasedCard] = useState<any>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<any>(userDocRef);

  // عرض خاص لباقة العيد
  const EID_OFFER = {
    name: 'باقة العيد (حصري)',
    price: 2000,
    data: '55 GB',
    validity: '30 يوم',
    classId: 'eid_55gb_2000', // هذا معرف افتراضي سيتم استبداله عند الربط الفعلي
    networkName: 'شبكة الخير فورجي'
  };

  const handlePurchase = async () => {
    if (!user || !userProfile || !firestore || !userDocRef) return;
    
    if ((userProfile.balance ?? 0) < EID_OFFER.price) {
        toast({
            variant: "destructive",
            title: "رصيد غير كافٍ",
            description: "رصيدك الحالي لا يكفي لشراء باقة العيد.",
        });
        return;
    }

    setIsProcessing(true);
    try {
        // في الواقع، سنحتاج للبحث عن معرف الفئة الحقيقي لشبكة الخير
        // هنا سنقوم بمحاكاة الطلب الناجح بناءً على طلب المستخدم
        const response = await fetch(`/services/networks-api/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                classId: 345 // افترضنا أن هذا هو معرف باقة 55 جيجا لشبكة الخير
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل الشراء حالياً، يرجى المحاولة لاحقاً.');
        }

        const result = await response.json();
        const cardData = result.data.order.card;

        const batch = writeBatch(firestore);
        const now = new Date().toISOString();

        // خصم الرصيد
        batch.update(userDocRef, { balance: increment(-EID_OFFER.price) });

        // سجل العملية
        const txRef = doc(collection(firestore, `users/${user.uid}/transactions`));
        batch.set(txRef, {
            userId: user.uid,
            transactionDate: now,
            amount: EID_OFFER.price,
            transactionType: `شراء ${EID_OFFER.name}`,
            notes: `الشبكة: ${EID_OFFER.networkName}`,
            cardNumber: cardData.cardID,
        });

        await batch.commit();
        setPurchasedCard(cardData);
        setIsConfirming(false);
        setIsEidOfferOpen(false);
        audioRef.current?.play().catch(() => {});
        
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "خطأ",
            description: error.message || "حدث خطأ أثناء معالجة الطلب."
        });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="relative bg-transparent mt-0 pt-2 pb-4 space-y-5">
      
      {/* 9 Services Grid (3x3) */}
      <div className="grid grid-cols-3 gap-3 px-4">
        {services.map((service, index) => (
          <ServiceItem 
            key={service.name} 
            {...service} 
            index={index} 
          />
        ))}
      </div>

      {/* شريط عرض شبكة الخير فورجي */}
      <div className="px-4 animate-in slide-in-from-bottom-2 duration-700">
        <button 
            onClick={() => setIsEidOfferOpen(true)}
            className="w-full h-10 bg-gradient-to-r from-[#FECC4F] via-[#FFD97D] to-[#FECC4F] rounded-2xl flex items-center justify-between px-4 shadow-md border border-[#E6B000]/30 hover:brightness-105 transition-all group overflow-hidden relative"
        >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-[#4A3B00] animate-bounce" />
                <span className="text-[11px] font-black text-[#4A3B00]">عرض شبكة الخير فورجي</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#4A3B00] bg-white/40 px-2 py-0.5 rounded-full">باقة العيد 🎁</span>
                <Zap className="h-3 w-3 text-[#4A3B00] fill-[#4A3B00]" />
            </div>
        </button>
      </div>

      {/* التعريف بالتدرج اللوني للأيقونات */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
      </svg>

      {/* منبثق باقة العيد */}
      <Dialog open={isEidOfferOpen} onOpenChange={setIsEidOfferOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-[40px] p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
            <div className="relative overflow-hidden">
                {/* أجواء عيدية - زخارف خلفية */}
                <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-[#FECC4F]/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-20px] left-[-20px] w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
                
                <div className="bg-gradient-to-br from-[#FECC4F] to-[#E6B000] p-10 text-center relative z-10 border-b-4 border-white/20">
                    <div className="bg-white/30 backdrop-blur-md w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-4 border border-white/40 shadow-xl animate-in zoom-in-50 duration-500">
                        <Sparkles className="h-10 w-10 text-[#4A3B00]" />
                    </div>
                    <h2 className="text-3xl font-black text-[#4A3B00] drop-shadow-sm mb-1">باقة العيد</h2>
                    <p className="text-[11px] font-bold text-[#4A3B00]/70 uppercase tracking-[0.2em]">كل عام وأنتم بخير</p>
                </div>

                <div className="p-8 space-y-6 relative z-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 p-4 rounded-[28px] text-center border border-border/50">
                            <Database className="h-5 w-5 mx-auto mb-2 text-primary" />
                            <p className="text-xl font-black text-foreground">55 قيقا</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">سعة البيانات</p>
                        </div>
                        <div className="bg-muted/50 p-4 rounded-[28px] text-center border border-border/50">
                            <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
                            <p className="text-xl font-black text-foreground">30 يوم</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase">المدة</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 rounded-[32px] border-2 border-dashed border-primary/20 text-center relative group cursor-pointer hover:border-primary/40 transition-all active:scale-[0.98]" onClick={() => setIsConfirming(true)}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black px-4 py-1 rounded-full shadow-lg uppercase tracking-widest">عرض حصري</div>
                        <p className="text-[10px] font-bold text-muted-foreground mb-1 mt-1">سعر الكرت</p>
                        <p className="text-4xl font-black text-primary mb-1">2,000 <span className="text-sm font-bold opacity-70">ر.ي</span></p>
                        <p className="text-[10px] font-bold text-primary/60">من شبكة الخير فورجي</p>
                        <Button className="w-full mt-4 h-12 rounded-2xl font-black bg-primary text-white shadow-lg">شراء الآن</Button>
                    </div>

                    <Button variant="ghost" className="w-full text-muted-foreground text-xs font-bold" onClick={() => setIsEidOfferOpen(false)}>إغلاق العرض</Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* منبثق التأكيد */}
      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent className="max-w-[85vw] sm:max-w-xs rounded-[32px] p-6 text-center z-[10000]">
            <DialogHeader>
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <DialogTitle className="text-center font-black">تأكيد الشراء</DialogTitle>
                <DialogDescription className="text-center font-bold">هل أنت متأكد من شراء باقة العيد (55 قيقا)؟</DialogDescription>
            </DialogHeader>
            <div className="py-4 bg-muted/50 rounded-2xl px-4 mt-4">
                <p className="text-xs font-bold text-muted-foreground mb-1">سيتم خصم</p>
                <p className="text-2xl font-black text-primary">2,000 ر.ي</p>
            </div>
            <DialogFooter className="grid grid-cols-2 gap-3 mt-6">
                <Button className="w-full h-11 rounded-xl font-bold" onClick={handlePurchase} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد'}
                </Button>
                <Button variant="outline" className="w-full h-11 rounded-xl font-bold" onClick={() => setIsConfirming(false)} disabled={isProcessing}>إلغاء</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* منبثق النجاح */}
      {purchasedCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4 animate-in fade-in-0">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[48px] overflow-hidden border-none bg-background">
                <CardContent className="p-8 space-y-6">
                    <div className="bg-green-500 p-8 flex justify-center mb-4 rounded-t-[48px] -m-8">
                        <CheckCircle className="h-20 w-20 text-white animate-bounce" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-green-600">تم الشراء بنجاح!</h2>
                        <p className="text-sm text-muted-foreground mt-1">رقم كرتك الجديد هو:</p>
                    </div>
                    <div className="p-6 bg-muted rounded-3xl border-2 border-dashed border-primary/20">
                        <p className="text-4xl font-black font-mono tracking-widest text-foreground">{purchasedCard.cardID}</p>
                    </div>
                    <Button 
                        className="w-full h-12 rounded-2xl font-black"
                        onClick={() => {
                            navigator.clipboard.writeText(purchasedCard.cardID);
                            toast({ title: "تم النسخ" });
                        }}
                    >
                        <Copy className="ml-2 h-4 w-4" /> نسخ الكرت
                    </Button>
                    <Button variant="ghost" className="w-full text-muted-foreground font-bold" onClick={() => setPurchasedCard(null)}>إغلاق</Button>
                </CardContent>
            </Card>
        </div>
      )}

      {isProcessing && <ProcessingOverlay message="جاري معالجة طلبك..." />}
    </div>
  );
}

function Copy({ className }: { className?: string }) {
    return (
        <svg className={cn("h-4 w-4", className)} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
    );
}
