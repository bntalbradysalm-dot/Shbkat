
'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Wallet,
  SatelliteDish,
  History,
  Wifi,
  Smartphone,
  MessageCircleQuestion,
  ArrowLeftRight,
  Heart,
  Gamepad2,
  Percent,
  ChevronLeft,
  Loader2,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type Service = {
  name: string;
  icon: LucideIcon;
  href: string;
};

const services: Service[] = [
  { name: 'تسديد رصيد', icon: Smartphone, href: '/telecom-services' },
  { name: 'الشبكات', icon: Wifi, href: '/services' },
  { name: 'منظومة الوادي', icon: SatelliteDish, href: '/alwadi' },
  { name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
  { name: 'شدات ببجي', icon: Gamepad2, href: '/games' },
  { name: 'المفضلة', icon: Heart, href: '/favorites' },
  { name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
  { name: 'سجل العمليات', icon: History, href: '/transactions' },
  { name: 'الدعم الفني', icon: MessageCircleQuestion, href: '/support' },
];

type Advertisement = {
  id: string;
  imageUrl: string;
  linkUrl?: string;
};

const ServiceItem = ({
  name,
  icon: Icon,
  index,
  href,
}: Service & { index: number }) => {
  return (
    <Link href={href} className="w-full">
      <div 
        className="group flex flex-col items-center justify-center bg-white dark:bg-slate-900 aspect-square rounded-[32px] shadow-sm border border-border/40 hover:shadow-md transition-all duration-300 active:scale-95 animate-in fade-in-0 zoom-in-95"
        style={{
          animationDelay: `${100 + index * 50}ms`,
          animationFillMode: 'backwards',
        }}
      >
        <div className="mb-2">
          <Icon 
            className="h-9 w-9 text-primary transition-transform group-hover:scale-110" 
            style={{ strokeWidth: 1.5 }}
          />
        </div>
        <span className="text-[11px] font-black text-foreground text-center px-1 leading-tight">{name}</span>
      </div>
    </Link>
  );
};

export function ServiceGrid() {
  const firestore = useFirestore();
  
  // Fetch Advertisements for the Banner
  const adsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'advertisements') : null),
    [firestore]
  );
  const { data: ads, isLoading: isLoadingAds } = useCollection<Advertisement>(adsCollection);

  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  return (
    <div className="relative bg-transparent mt-0 pt-2 pb-4 space-y-6">
      
      {/* Banner Section (Dynamic from Ads Management) */}
      <div className="px-4">
        {isLoadingAds ? (
          <Card className="w-full aspect-[21/9] rounded-[32px] flex items-center justify-center bg-muted/30 border-none">
            <Loader2 className="h-6 w-6 animate-spin text-primary/30" />
          </Card>
        ) : ads && ads.length > 0 ? (
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent>
              {ads.map((ad) => (
                <CarouselItem key={ad.id}>
                  <div className="relative w-full aspect-[21/9] rounded-[32px] overflow-hidden shadow-sm border border-border/20">
                    <Image
                      src={ad.imageUrl}
                      alt="Promotional Banner"
                      fill
                      className="object-cover"
                      priority
                    />
                    {ad.linkUrl && (
                      <Link href={ad.linkUrl} className="absolute inset-0 z-10">
                        <span className="sr-only">انقر للتفاصيل</span>
                      </Link>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          /* Default Placeholder if no ads */
          <div className="relative w-full aspect-[21/9] rounded-[32px] overflow-hidden shadow-sm bg-mesh-gradient flex flex-col items-center justify-center text-white p-6">
             <Star className="h-8 w-8 mb-2 opacity-50" />
             <h3 className="font-black text-lg">ستار موبايل</h3>
             <p className="text-[10px] font-bold opacity-80">عالم من الخدمات الرقمية بين يديك</p>
          </div>
        )}
      </div>

      {/* 9 Services Grid (3x3) */}
      <div className="grid grid-cols-3 gap-4 px-4">
        {services.map((service, index) => (
          <ServiceItem 
            key={service.name} 
            {...service} 
            index={index} 
          />
        ))}
      </div>

      {/* Featured Offers Card */}
      <div className="px-4 mt-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-1000">
        <Card 
          className="overflow-hidden border-none bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer rounded-[24px] border border-primary/10 shadow-sm active:scale-95"
        >
          <Link href="/services" className="p-4 flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <Percent className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black text-primary">عروض حصرية</h3>
                <p className="text-[10px] text-muted-foreground font-bold">اطلع على أحدث العروض والخدمات المضافة</p>
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 text-primary/50" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
