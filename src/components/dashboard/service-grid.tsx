
'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  SatelliteDish,
  History,
  Wifi,
  Smartphone,
  MessageCircleQuestion,
  Heart,
  Gamepad2,
  ArrowLeftRight,
  ChevronLeft,
  Tv,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Service = {
  name: string;
  icon: any;
  href?: string;
  isTrigger?: boolean;
};

const AlsafaaIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <div className={cn("relative", className)} style={style}>
    <Image 
      src="https://i.postimg.cc/HWc1sG9N/20260324-231520.png" 
      alt="شبكة الصفاء الرقمية" 
      fill 
      className="object-contain"
    />
  </div>
);

const AlwadiLogoIcon = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
  <div className={cn("relative", className)} style={style}>
    <Image 
      src="https://i.postimg.cc/MKMWP3VG/15.jpg" 
      alt="منظومة الوادي" 
      fill 
      className="object-contain"
    />
  </div>
);

const ServiceItem = ({
  name,
  icon: Icon,
  index,
  href,
  isTrigger,
  onClick,
}: Service & { index: number, onClick?: () => void }) => {
  const content = (
    <div 
      className="group flex flex-col items-center justify-center bg-white dark:bg-slate-900 aspect-[1.1/1] rounded-[28px] shadow-sm border border-border/40 hover:shadow-md transition-all duration-300 active:scale-95 animate-in fade-in-0 zoom-in-95"
      style={{
        animationDelay: `${100 + index * 50}ms`,
        animationFillMode: 'backwards',
      }}
      onClick={isTrigger ? onClick : undefined}
    >
      <div className="mb-1.5">
        <Icon 
          className="h-8 w-8 transition-transform group-hover:scale-110" 
          style={{ 
              strokeWidth: 2,
              stroke: (name === 'شبكة الصفاء الرقمية' || name === 'منظومة الوادي') ? undefined : 'url(#icon-gradient)'
          }}
        />
      </div>
      <span className="text-[10px] font-black text-foreground text-center px-1 leading-tight">{name}</span>
    </div>
  );

  if (isTrigger) {
    return <div className="w-full cursor-pointer">{content}</div>;
  }

  return (
    <Link href={href || '#'} className="w-full">
      {content}
    </Link>
  );
};

export function ServiceGrid() {
  const [isDigitalNetworksOpen, setIsDigitalNetworksOpen] = useState(false);

  const services: Service[] = [
    { name: 'تسديد رصيد', icon: Smartphone, href: '/telecom-services' },
    { name: 'الشبكات', icon: Wifi, href: '/services' },
    { name: 'شبكات البث الرقمي', icon: Tv, isTrigger: true },
    { name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
    { name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
    { name: 'شدات ببجي', icon: Gamepad2, href: '/games' },
    { name: 'المفضلة', icon: Heart, href: '/favorites' },
    { name: 'سجل العمليات', icon: History, href: '/transactions' },
    { name: 'الدعم الفني', icon: MessageCircleQuestion, href: '/support' },
  ];

  return (
    <div className="relative bg-transparent mt-0 pt-2 pb-4 space-y-4">
      
      <div className="grid grid-cols-3 gap-3 px-4">
        {services.map((service, index) => (
          <ServiceItem 
            key={service.name} 
            {...service} 
            index={index} 
            onClick={service.isTrigger ? () => setIsDigitalNetworksOpen(true) : undefined}
          />
        ))}
      </div>

      <Dialog open={isDigitalNetworksOpen} onOpenChange={setIsDigitalNetworksOpen}>
        <DialogContent className="rounded-[40px] max-sm p-6 overflow-hidden border-none shadow-2xl bg-[#F8FAFC] dark:bg-slate-950 [&>button]:hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <DialogHeader className="mb-6 relative z-10">
                <div className="bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Tv className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-xl font-black text-primary text-center">شبكات البث الرقمي</DialogTitle>
                <DialogDescription className="text-center font-bold text-xs text-muted-foreground">
                    اختر المنظومة التي ترغب بتجديدها
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 relative z-10">
                <Link href="/alwadi" onClick={() => setIsDigitalNetworksOpen(false)}>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-[28px] border-2 border-transparent hover:border-primary/20 transition-all shadow-sm flex items-center justify-between group active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors overflow-hidden flex items-center justify-center">
                                <AlwadiLogoIcon className="h-6 w-12" />
                            </div>
                            <div className="text-right">
                                <p className="font-black text-sm text-foreground">منظومة الوادي</p>
                                <p className="text-[10px] font-bold text-muted-foreground">تجديد مباشر</p>
                            </div>
                        </div>
                        <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:-translate-x-1" />
                    </div>
                </Link>

                <Link href="/alsafaa" onClick={() => setIsDigitalNetworksOpen(false)}>
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-[28px] border-2 border-transparent hover:border-primary/20 transition-all shadow-sm flex items-center justify-between group active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors overflow-hidden flex items-center justify-center">
                                <AlsafaaIcon className="h-6 w-12" />
                            </div>
                            <div className="text-right">
                                <p className="font-black text-sm text-foreground">شبكة الصفاء الرقمية</p>
                                <p className="text-[10px] font-bold text-muted-foreground">تجديد API مباشر</p>
                            </div>
                        </div>
                        <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:-translate-x-1" />
                    </div>
                </Link>
            </div>

            <div className="mt-6">
                <button 
                    onClick={() => setIsDigitalNetworksOpen(false)}
                    className="w-full py-3 rounded-2xl text-xs font-black text-muted-foreground hover:text-foreground transition-colors"
                >
                    إغلاق
                </button>
            </div>
        </DialogContent>
      </Dialog>

      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
