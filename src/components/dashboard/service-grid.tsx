
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
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Card } from '@/components/ui/card';

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
                strokeWidth: 2.5,
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
  return (
    <div className="relative bg-transparent mt-0 pt-2 pb-4 space-y-5">
      
      {/* 9 Services Grid (3x3) - Compact Height */}
      <div className="grid grid-cols-3 gap-3 px-4">
        {services.map((service, index) => (
          <ServiceItem 
            key={service.name} 
            {...service} 
            index={index} 
          />
        ))}
      </div>

      {/* Featured Offers Card */}
      <div className="px-4 mt-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-1000">
        <Card 
          className="overflow-hidden border-none bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer rounded-[22px] border border-primary/10 shadow-sm active:scale-95"
        >
          <Link href="/baity-networks" className="p-3.5 flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <Percent className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="text-right">
                <h3 className="text-xs font-black text-primary">عروض حصرية</h3>
                <p className="text-[9px] text-muted-foreground font-bold">اطلع على أحدث العروض وفئات الخير المضافة</p>
              </div>
            </div>
            <ChevronLeft className="h-4 w-4 text-primary/50" />
          </Link>
        </Card>
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
    </div>
  );
}
