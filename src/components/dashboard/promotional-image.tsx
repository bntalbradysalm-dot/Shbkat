
"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
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
    const { user } = useUser();
    
    const adsCollection = useMemoFirebase(
      () => (firestore && user ? collection(firestore, 'advertisements') : null),
      [firestore, user]
    );

    const { data: ads, isLoading } = useCollection<Advertisement>(adsCollection);

    const promoImage = (ad: Advertisement) => (
        <Card className="w-full overflow-hidden rounded-2xl shadow-lg">
            <div className="relative aspect-[2/1] w-full">
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
                <Skeleton className="w-full aspect-[2/1] rounded-2xl" />
            </div>
        )
    }
    
    if (!ads || ads.length === 0) {
        return null;
    }

    return (
        <div className="pt-4 animate-in fade-in-0 zoom-in-95 duration-500 px-4">
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
    );
}
