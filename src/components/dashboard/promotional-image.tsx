"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import React from 'react';

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
    
    if (isLoading) {
        return (
             <div className="px-4 pt-4">
                <Skeleton className="w-full aspect-[2/1] rounded-2xl" />
            </div>
        )
    }
    
    // Display only the first ad if available
    const firstAd = ads && ads.length > 0 ? ads[0] : null;

    if (!firstAd) {
        return null;
    }

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

    return (
        <div className="animate-in fade-in-0 zoom-in-95 duration-500 px-4 pt-4">
           {firstAd.linkUrl ? (
              <Link href={firstAd.linkUrl} className="block">
                  {promoImage(firstAd)}
              </Link>
          ) : (
              promoImage(firstAd)
          )}
        </div>
    );
}
