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
  Heart,
  Landmark,
  CreditCard,
  ArrowLeftRight,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';

type Service = {
  name: string;
  icon: LucideIcon;
  href: string;
};

const services: Service[] = [
  { name: 'مدفوعات', icon: CreditCard, href: '/telecom-services' },
  { name: 'حوالات', icon: Send, href: '/transfer' },
  { name: 'سحب نقدي', icon: Smartphone, href: '/top-up' }, // Placeholder icons to match design
  { name: 'مصارفة', icon: ArrowLeftRight, href: '/transfer' },
  { name: 'مشتريات', icon: ShoppingBag, href: '/store' },
  { name: 'رصيد وباقات', icon: Smartphone, href: '/telecom-services' },
  { name: 'البطائق الرقمية', icon: CreditCard, href: '/services' },
  { name: 'كشف حساب', icon: ClipboardList, href: '/transactions' },
  { name: 'الخدمات البنكية', icon: Landmark, href: '/top-up' },
];

const ServiceItem = ({
  name,
  icon: Icon,
  href,
  index,
}: Service & { index: number }) => (
  <Link
    href={href}
    className="group flex flex-col items-center justify-start space-y-2 focus:outline-none animate-in fade-in-0 zoom-in-95"
    style={{
      animationDelay: `${100 + index * 50}ms`,
      animationFillMode: 'backwards',
    }}
  >
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card border border-border/50 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1">
      <Icon className="h-10 w-10 text-primary transition-transform group-hover:scale-110" />
    </div>
    <span className="text-xs font-bold text-primary text-center px-1">{name}</span>
  </Link>
);

export function ServiceGrid() {
  return (
    <div className="relative bg-background rounded-t-[40px] mt-6 pt-8 pb-4">
      <div className="grid grid-cols-3 gap-y-6 gap-x-4 px-6">
        {services.map((service, index) => (
          <ServiceItem key={service.name} {...service} index={index} />
        ))}
      </div>
    </div>
  );
}
