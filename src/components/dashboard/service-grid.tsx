import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  ArrowUpRight,
  Server,
  Send,
  Star,
  LifeBuoy
} from 'lucide-react';
import Link from 'next/link';

type Service = {
  name: string;
  icon: LucideIcon;
  href: string;
}

const services: Service[] = [
  { name: 'الشبكات', icon: Globe, href: '/services' },
  { name: 'غذي حسابك', icon: ArrowUpRight, href: '/top-up' },
  { name: 'منظومة الوادي', icon: Server, href: '/alwadi' },
  { name: 'تحويل لمشترك', icon: Send, href: '/transfer' },
  { name: 'المفضلة', icon: Star, href: '/favorites' },
  { name: 'الدعم الفني', icon: LifeBuoy, href: '/support' },
];


const ServiceItem = ({ name, icon: Icon, href, index }: Service & { index: number }) => (
  <Link 
    href={href} 
    className="flex flex-col items-center justify-start space-y-2 rounded-lg p-2 text-center transition-all duration-200 hover:bg-primary/5 focus:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 animate-in fade-in-0 zoom-in-95"
    style={{ animationDelay: `${500 + index * 75}ms`, animationFillMode: 'backwards' }}
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
      <Icon className="h-8 w-8 text-primary" />
    </div>
    <span className="text-xs font-medium text-foreground h-8">{name}</span>
  </Link>
);


export function ServiceGrid() {
  return (
    <div className="p-4 mt-4">
        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
            {services.map((service, index) => <ServiceItem key={service.name} {...service} index={index} />)}
        </div>
    </div>
  );
}
