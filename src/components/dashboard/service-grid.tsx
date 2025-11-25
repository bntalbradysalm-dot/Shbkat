import type { LucideIcon } from 'lucide-react';
import {
  Smartphone, Wifi, Phone, Droplets, Zap, Send, Globe, Star, Users, History
} from 'lucide-react';
import Link from 'next/link';

type Service = {
  name: string;
  icon: LucideIcon;
  href: string;
}

const quickActions: Service[] = [
  { name: 'تحويل مشترك', icon: Send, href: '/transfer' },
  { name: 'المفضلة', icon: Star, href: '/favorites' },
  { name: 'سجل العمليات', icon: History, href: '/history' },
  { name: 'خدمة العملاء', icon: Users, href: '/support' },
];

const networkServices: Service[] = [
  { name: 'يمن موبايل', icon: Smartphone, href: '/services/yemen-mobile' },
  { name: 'YOU', icon: Smartphone, href: '/services/you' },
  { name: 'سبأفون', icon: Smartphone, href: '/services/sabafon' },
  { name: 'واي', icon: Smartphone, href: '/services/y' },
];

const billServices: Service[] = [
    { name: 'انترنت ADSL', icon: Wifi, href: '/bills/adsl' },
    { name: 'الهاتف الثابت', icon: Phone, href: '/bills/landline' },
    { name: 'الماء', icon: Droplets, href: '/bills/water' },
    { name: 'الكهرباء', icon: Zap, href: '/bills/electricity' },
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

const ServiceSection = ({ title, services }: { title: string, services: Service[] }) => (
  <div>
    <h3 className="mb-4 text-lg font-semibold text-right text-foreground/90">{title}</h3>
    <div className="grid grid-cols-4 gap-x-2 gap-y-4">
      {services.map((service, index) => <ServiceItem key={service.name} {...service} index={index} />)}
    </div>
  </div>
);

export function ServiceGrid() {
  return (
    <div className="flex flex-col gap-8 p-4 mt-4">
      <ServiceSection title="وصول سريع" services={quickActions} />
      <ServiceSection title="خدمات الشبكات" services={networkServices} />
      <ServiceSection title="سداد الفواتير" services={billServices} />
    </div>
  );
}
