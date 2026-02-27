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
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

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
  
  const [alKhairNetwork, setAlKhairNetwork] = useState<any>(null);
  const [specialOffers, setAlKhairOffers] = useState<any[]>([]);
  const [isFetchingOffers, setIsFetchingOffers] = useState(false);

  // البحث عن شبكة الخير فورجي عند فتح المنبثق
  useEffect(() => {
    if (isOffersOpen && firestore) {
        const fetchAlKhairOffers = async () => {
            setIsFetchingOffers(true);
            try {
                const netsRef = collection(firestore, 'networks');
                const q = query(netsRef, where('name', '>=', 'شبكة الخير'), where('name', '<=', 'شبكة الخير' + '\uf8ff'), limit(1));
                const snap = await getDocs(q);
                
                if (!snap.empty) {
                    const net = { id: snap.docs[0].id, ...snap.docs[0].data() };
                    setAlKhairNetwork(net);
                    
                    const catsRef = collection(firestore, `networks/${net.id}/cardCategories`);
                    const catsSnap = await getDocs(catsRef);
                    const cats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    
                    // تصفية فئات 1000، 1200، 1500
                    const targetPrices = [1000, 1200, 1500];
                    const filtered = cats.filter((c: any) => targetPrices.includes(Number(c.price)));
                    setAlKhairOffers(filtered.sort((a: any, b: any) => a.price - b.price));
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

      {/* Offers Modal - التحديث الجديد للعروض */}
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
                                    onClick={() => {
                                        setIsOffersOpen(false);
                                        router.push(`/network-cards/${alKhairNetwork.id}?name=${encodeURIComponent(alKhairNetwork.name)}`);
                                    }}
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
    </div>
  );
}
