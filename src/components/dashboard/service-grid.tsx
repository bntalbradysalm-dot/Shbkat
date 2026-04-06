
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
  const services: Service[] = [
    { name: 'تسديد رصيد', icon: Smartphone, href: '/telecom-services' },
    { name: 'الشبكات', icon: Wifi, href: '/services' },
    { name: 'منظومة الوادي', icon: AlwadiLogoIcon, href: '/alwadi' },
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
          />
        ))}
      </div>

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
