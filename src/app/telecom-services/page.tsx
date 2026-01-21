'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const telecomServices = [
  {
    name: 'يمن موبايل',
    logo: 'https://i.postimg.cc/tTXzYWY3/1200x630wa.jpg',
    href: '/yemen-mobile',
    description: 'سداد فواتير، باقات، وشحن رصيد',
  },
  {
    name: 'YOU',
    logo: 'https://i.postimg.cc/d1y34P1t/you-logo.png',
    href: '/you-services',
    description: 'سداد فواتير وباقات شركة YOU',
  },
  {
    name: 'يمن فورجي',
    logo: 'https://i.postimg.cc/0jWzZJJd/yemen-4g-logo.png',
    href: '/yemen-4g',
    description: 'استعلام وسداد باقات يمن فورجي',
  },
  {
    name: 'الهاتف الثابت و ADSL',
    logo: 'https://i.postimg.cc/tJn0r3rV/yemennet-logo.png',
    href: '/internet-landline',
    description: 'سداد فواتير الهاتف الثابت ونت ADSL',
  },
];

export default function TelecomServicesPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="خدمات الاتصالات والانترنت" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {telecomServices.map((service, index) => (
            <Link href={service.href} key={service.name}>
              <Card
                className="cursor-pointer bg-card text-card-foreground hover:bg-muted/50 transition-colors animate-in fade-in-0 rounded-2xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-xl flex items-center justify-center h-14 w-14">
                        <Image
                          src={service.logo}
                          alt={`${service.name} logo`}
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-base">{service.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
