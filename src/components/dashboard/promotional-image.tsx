
"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

type Advertisement = {
    id: string;
    imageUrl: string;
    linkUrl?: string;
};

export function PromotionalImage() {
    const firestore = useFirestore();
    
    const adsCollection = useMemoFirebase(
      () => (firestore ? collection(firestore, 'advertisements') : null),
      [firestore]
    );

    const { data: ads, isLoading } = useCollection<Advertisement>(adsCollection);

    const promoImage = (ad: Advertisement) => (
        <Card className="w-full overflow-hidden rounded-2xl shadow-lg border-none">
            <div className="relative aspect-[16/9] w-full">
                <Image
                    src={ad.imageUrl}
                    alt="Promotional Banner"
                    fill
                    className="object-cover"
                />
            </div>
        </Card>
    );
    
    if (isLoading) {
        return (
             <div className="px-4 pt-4">
                <Skeleton className="w-full aspect-[16/9] rounded-2xl" />
            </div>
        )
    }
    
    if (!ads || ads.length === 0) {
        // Return a default logo if no ads are available
        return (
            <div className="flex justify-center mb-6">
                <Image 
                    src="https://i.postimg.cc/CMjm7nHT/20251116-001234.png" 
                    alt="Shabakat Wallet Logo" 
                    width={120} 
                    height={120} 
                    className="object-contain"
                    priority
                />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in-0 zoom-in-95 duration-500">
          <div className="px-4">
            <Carousel
                className="w-full"
                plugins={[
                    Autoplay({
                        delay: 3000,
                        stopOnInteraction: false,
                    }),
                ]}
                opts={{
                    loop: true,
                }}
            >
                <CarouselContent>
                    {ads.map((ad) => (
                        <CarouselItem key={ad.id}>
                           <div className="p-1">
                                {ad.linkUrl ? (
                                    <Link href={ad.linkUrl} className="block">
                                        {promoImage(ad)}
                                    </Link>
                                ) : (
                                    promoImage(ad)
                                )}
                           </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
          </div>
        </div>
    );
}
