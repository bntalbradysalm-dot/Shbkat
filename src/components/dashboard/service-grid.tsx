'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  SatelliteDish,
  Send,
  History,
  Wifi,
  Smartphone,
  ShoppingBag,
  CreditCard,
  ArrowLeftRight,
  FileText,
  Heart,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

type Service = {
  name: string;
  icon: LucideIcon;
  href: string;
  isComingSoon?: boolean;
};

const services: Service[] = [
  { name: 'تسديد رصيد', icon: Smartphone, href: '/telecom-services' },
  { name: 'حجوزات', icon: Ticket, href: '#', isComingSoon: true },
  { name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
  { name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
  { name: 'مشتريات', icon: ShoppingBag, href: '/store' },
  { name: 'المفضلة', icon: Heart, href: '/favorites' },
  { name: 'الشبكات', icon: Wifi, href: '/services' },
  { name: 'سجل العمليات', icon: History, href: '/transactions' },
  { name: 'منظومة الوادي', icon: SatelliteDish, href: '/alwadi' },
];

const ServiceItem = ({
  name,
  icon: Icon,
  index,
  href,
  onClick,
}: Service & { index: number; onClick?: () => void }) => {
  const content = (
    <div className="group flex flex-col items-center justify-start space-y-2 focus:outline-none animate-in fade-in-0 zoom-in-95 cursor-pointer"
      style={{
        animationDelay: `${100 + index * 50}ms`,
        animationFillMode: 'backwards',
      }}
      onClick={onClick}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card border border-border/50 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
        <Icon 
          className="h-10 w-10 transition-transform group-hover:scale-110" 
          style={{ stroke: 'url(#icon-gradient)' }}
        />
      </div>
      <span className="text-xs font-bold text-primary text-center px-1">{name}</span>
    </div>
  );

  if (href === '#') {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
};

export function ServiceGrid() {
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

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
            onClick={service.isComingSoon ? () => setIsComingSoonOpen(true) : undefined}
          />
        ))}
      </div>

      <Dialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen}>
        <DialogContent className="rounded-[32px] max-w-sm">
          <DialogHeader>
            <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Ticket className="text-primary h-8 w-8" />
            </div>
            <DialogTitle className="text-center text-xl font-black">قريباً</DialogTitle>
            <DialogDescription className="text-center text-base font-bold">
              هذه الخدمة ستكون متاحة قريباً في تحديثات التطبيق القادمة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button className="w-full rounded-2xl h-12 font-black">حسناً</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}