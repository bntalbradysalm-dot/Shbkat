"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";

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
    
    // We are looking for a specific ad with id 'promo-banner'
    const ad = ads?.find(a => a.id === 'promo-banner');

    if (isLoading) {
        return (
             <div className="px-4 pt-2">
                <Skeleton className="w-full aspect-[2/1] rounded-2xl" />
            </div>
        )
    }

    if (!ad || !ad.imageUrl) {
        return null;
    }

    const promoImage = (
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
        <div className="animate-in fade-in-0 zoom-in-95 duration-500 px-4 pt-2">
            {ad.linkUrl ? (
                <Link href={ad.linkUrl} className="block">
                    {promoImage}
                </Link>
            ) : (
                promoImage
            )}
        </div>
    );
}
