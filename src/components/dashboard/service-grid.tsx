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
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

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
  { name: 'المشتريات', icon: ShoppingBag, href: '/store' },
  { name: 'المفضلة', icon: Heart, href: '/favorites' },
  { name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
  { name: 'سجل العمليات', icon: History, href: '/transactions' },
  { name: 'شدات ببجي', icon: Gamepad2, href: '/games' },
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
    </div>
  );
}
