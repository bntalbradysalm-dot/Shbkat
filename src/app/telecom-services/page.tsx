'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, Wifi, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const companies = [
  {
    name: 'يمن موبايل',
    icon: 'https://i.postimg.cc/52nxCtk5/images.png',
    href: '/yemen-mobile-services',
  },
  {
    name: 'YOU',
    icon: 'https://i.postimg.cc/W3t9tD5B/Yo-Logo.png',
    href: '/you-services',
  },
  {
    name: 'يمن 4G',
    icon: 'https://i.postimg.cc/d1qWc06N/Yemen-4g-logo.png',
    href: '/yemen-4g-services',
  },
  {
    name: 'الإنترنت والهاتف الثابت',
    icon: Phone,
    href: '/landline-services',
  },
];

export default function TelecomPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="رصيد وباقات" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {companies.map((company, index) => (
            <Link
              href={'#'}
              key={company.name}
              className="group cursor-pointer transition-all duration-300 animate-in fade-in-0 zoom-in-95"
              style={{ animationDelay: `${100 + index * 100}ms` }}
            >
              <Card className="p-4 flex flex-col items-center justify-center text-center aspect-square border bg-card rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1">
                <div className="p-3 bg-primary/10 rounded-lg mb-3 flex items-center justify-center h-16 w-16">
                  {typeof company.icon === 'string' ? (
                    <Image
                      src={company.icon}
                      alt={`${company.name} logo`}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  ) : (
                    <company.icon className="h-8 w-8 text-primary dark:text-primary-foreground" />
                  )}
                </div>
                <span className="font-bold text-sm text-foreground/90">
                  {company.name}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
