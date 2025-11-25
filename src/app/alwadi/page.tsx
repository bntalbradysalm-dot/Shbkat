'use client';

import { CreditCard, ChevronLeft, Coins } from 'lucide-react';
import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import Link from 'next/link';

const renewalOptions = [
  { title: 'تجديد شهرين', duration: '2 months', price: 3000 },
  { title: 'تجديد 4 شهور', duration: '4 months', price: 6000 },
  { title: 'تجديد 6 شهور', duration: '6 months', price: 9000 },
  { title: 'تجديد سنة', duration: '1 year', price: 15000 },
];

export default function AlwadiPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="منظومة الوادي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renewalOptions.map((option, index) => (
          <Link
            href={`/alwadi/renew?title=${encodeURIComponent(
              option.title
            )}&price=${option.price}`}
            key={option.title}
            className="group cursor-pointer transition-all duration-300 animate-in fade-in-0 zoom-in-95"
            style={{ animationDelay: `${100 + index * 100}ms` }}
          >
            <div className="p-4 flex items-center justify-between border-b rounded-xl hover:bg-muted/50">
                <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-lg text-foreground/90">
                    {option.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-primary">
                      <Coins className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                          {option.price.toLocaleString('en-US')} ريال
                      </span>
                    </div>
                </div>
                </div>
                <ChevronLeft className="h-6 w-6 text-muted-foreground transition-transform group-hover:translate-x-[-4px] group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
