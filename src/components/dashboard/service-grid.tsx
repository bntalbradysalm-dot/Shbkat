import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  ArrowUpRight,
  Server,
  Send,
  Star,
  LifeBuoy,
} from 'lucide-react';
import Link from 'next/link';

type Service = {
  name: string;
  icon: LucideIcon;
  href: string;
};

const services: Service[] = [
  { name: 'الشبكات', icon: Globe, href: '/services' },
  { name: 'غذي حسابك', icon: ArrowUpRight, href: '/top-up' },
  { name: 'منظومة الوادي', icon: Server, href: '/alwadi' },
  { name: 'تحويل لمشترك', icon: Send, href: '/transfer' },
  { name: 'المفضلة', icon: Star, href: '/favorites' },
  { name: 'الدعم الفني', icon: LifeBuoy, href: '/support' },
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
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
      <Icon className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
    </div>
    <span className="h-8 text-xs font-semibold text-foreground/90">{name}</span>
  </Link>
);

export function ServiceGrid() {
  return (
    <div className="mt-4 relative bg-card rounded-t-3xl -mx-4 pt-6">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-200 rounded-full"></div>
      <div className="grid grid-cols-3 gap-3 p-4">
        {services.map((service, index) => (
          <ServiceItem key={service.name} {...service} index={index} />
        ))}
      </div>
    </div>
  );
}
