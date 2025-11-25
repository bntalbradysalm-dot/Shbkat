"use client";

import { Card } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import { useState, useEffect } from "react";

export function PromotionalImage() {
    const promoImage = PlaceHolderImages.find((img) => img.id === 'promo-banner');
    const [imageUrl, setImageUrl] = useState(promoImage?.imageUrl || '');

    useEffect(() => {
        // In a real app, you might fetch the current promotional image URL
        // from a backend or state management solution.
        const storedImageUrl = localStorage.getItem('promoImageUrl');
        if (storedImageUrl) {
            setImageUrl(storedImageUrl);
        } else if (promoImage) {
            setImageUrl(promoImage.imageUrl);
        }
    }, [promoImage]);


    if (!promoImage || !imageUrl) {
        return null;
    }

    return (
        <div className="animate-in fade-in-0 zoom-in-95 duration-500 delay-300">
            <Card className="w-full overflow-hidden rounded-2xl shadow-lg">
                <div className="relative aspect-[2/1] w-full">
                    <Image
                        src={imageUrl}
                        alt={promoImage.description}
                        data-ai-hint={promoImage.imageHint}
                        fill
                        className="object-cover"
                    />
                </div>
            </Card>
        </div>
    );
}
