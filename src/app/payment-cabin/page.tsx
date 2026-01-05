'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

type ServiceProvider = {
  name: string;
  logo: string;
  href: string;
  bgColor: string;
};

const providers: ServiceProvider[] = [
  { name: 'يمن موبايل', logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png', href: '/payment-cabin/yemen-mobile', bgColor: 'bg-red-500' },
  { name: 'YOU', logo: 'https://i.postimg.cc/TPyC1Prn/YOU-2.png', href: '/payment-cabin/you', bgColor: 'bg-blue-500' },
  { name: 'يمن 4G', logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png', href: '/payment-cabin/yemen-4g', bgColor: 'bg-yellow-500' },
  { name: 'ADSL', logo: 'https://i.postimg.cc/tCFs01p9/ADSL.png', href: '/payment-cabin/adsl', bgColor: 'bg-green-500' },
  { name: 'الهاتف الثابت', logo: 'https://i.postimg.cc/q73b2z3W/landline.png', href: '/payment-cabin/landline', bgColor: 'bg-purple-500' },
];

export default function PaymentCabinPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="كبينة السداد" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {providers.map((provider, index) => (
            <Link href={provider.href} key={provider.name}>
              <Card 
                className="group cursor-pointer transition-all duration-300 animate-in fade-in-0 zoom-in-95 overflow-hidden"
                style={{ animationDelay: `${100 + index * 100}ms` }}
              >
                <CardContent className="p-0 flex flex-col items-center justify-center text-center aspect-square hover:bg-muted/50">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 ${provider.bgColor}`}>
                     <Image src={provider.logo} alt={provider.name} width={48} height={48} className="object-contain" />
                  </div>
                  <span className="font-bold text-sm text-foreground/90">
                    {provider.name}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
