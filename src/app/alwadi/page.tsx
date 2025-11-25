'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

const renewalOptions = [
  { title: 'تجديد شهرين', duration: '2 months' },
  { title: 'تجديد 4 شهور', duration: '4 months' },
  { title: 'تجديد 6 شهور', duration: '6 months' },
  { title: 'تجديد سنة', duration: '1 year' },
];

export default function AlwadiPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 sticky top-0 bg-primary text-primary-foreground z-10 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" aria-label="العودة" className="hover:bg-white/20">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">منظومة الوادي</h1>
        <div className="w-10"></div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renewalOptions.map((option, index) => (
          <Card
            key={option.title}
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary animate-in fade-in-0 zoom-in-95"
            style={{ animationDelay: `${100 + index * 100}ms` }}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <CalendarClock className="h-6 w-6 text-primary" />
                </div>
                <span className="font-semibold text-foreground/90">{option.title}</span>
              </div>
              <ChevronLeft className="h-6 w-6 text-muted-foreground transition-transform group-hover:translate-x-[-4px] group-hover:text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
