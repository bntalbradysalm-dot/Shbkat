'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  SatelliteDish,
  Send,
  History,
  Wifi,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { PromotionalImage } from './promotional-image';
import { RecentTransactions } from './recent-transactions';
import Image from 'next/image';

type Service = {
  name: string;
  icon: LucideIcon | string;
  href: string;
};

const services: Service[] = [
  { name: 'الشبكات', icon: Wifi, href: '/services' },
  { name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
  { name: 'منظومة الوادي', icon: SatelliteDish, href: '/alwadi' },
  { name: 'تحويل لمشترك', icon: Send, href: '/transfer' },
  { name: 'يمن 4G', icon: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png', href: '/pay-balance' },
  { name: 'العمليات', icon: History, href: '/transactions' },
];

const ServiceItem = ({
  name,
  icon: Icon,
  href,
  index,
}: Service & { index: number }) => (
  <Link
    href={href}
    className="group flex flex-col items-center justify-start space-y-2 rounded-xl bg-card p-3 text-center shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 animate-in fade-in-0 zoom-in-95"
    style={{
      animationDelay: `${100 + index * 75}ms`,
      animationFillMode: 'backwards',
    }}
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted transition-colors group-hover:bg-primary/10">
      {typeof Icon === 'string' ? (
        <Image src={Icon} alt={name} width={32} height={32} className="transition-transform group-hover:scale-110 object-contain" />
      ) : (
        <Icon className="h-7 w-7 text-primary dark:text-primary-foreground transition-transform group-hover:scale-110" />
      )}
    </div>
    <span className="h-8 text-xs font-semibold text-foreground/90">{name}</span>
  </Link>
);

export function ServiceGrid() {
  return (
    <div className="relative bg-card rounded-t-3xl pt-2 pb-4">
      <div className="grid grid-cols-3 gap-3 px-4">
        {services.map((service, index) => (
          <ServiceItem key={service.name} {...service} index={index} />
        ))}
      </div>
    </div>
  );
}
