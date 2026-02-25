
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
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
        <DialogContent className="max-w-[85vw] sm:max-w-[320px] p-6 overflow-hidden rounded-[40px] border-none bg-white shadow-2xl flex flex-col items-center z-[9999] outline-none [&>button]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>العروض الحصرية</DialogTitle>
            <DialogDescription>استعراض أحدث العروض والخصومات المتاحة حالياً</DialogDescription>
          </DialogHeader>
          <div className="relative w-full flex flex-col items-center animate-in zoom-in-95 duration-500">
            {/* حاوية الصورة */}
            <div className="relative w-full aspect-[3/4] rounded-[32px] overflow-hidden border-2 border-muted bg-card mb-6">
              <Image 
                src="https://i.postimg.cc/SNtjK4ZZ/IMG-20260224-WA0012.jpg" 
                alt="Exclusive Offer" 
                fill 
                className="object-cover"
                priority
                unoptimized
              />
            </div>
            
            {/* زر الإغلاق السفلي بتدرج التطبيق الأزرق */}
            <Button 
                onClick={() => setIsOffersOpen(false)}
                className="w-full h-12 rounded-full bg-mesh-gradient text-white font-black text-base shadow-lg active:scale-95 transition-all border-none"
            >
                إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
