'use client';

import { CreditCard } from 'lucide-react';
import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

type RenewalOption = {
  id: string;
  title: string;
  price: number;
};

export default function AlwadiPage() {
  const firestore = useFirestore();
  const optionsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'alwadiOptions') : null),
    [firestore]
  );
  const { data: renewalOptions, isLoading } = useCollection<RenewalOption>(optionsCollection);

  const sortedOptions = React.useMemo(() => {
    if (!renewalOptions) return [];
    // Sort by price ascending
    return [...renewalOptions].sort((a, b) => a.price - b.price);
  }, [renewalOptions]);

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="منظومة الوادي" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6 overflow-hidden rounded-xl shadow-lg">
          <Image
            src="https://i.postimg.cc/HkKqQBMV/15.jpg"
            alt="Alwadi Promotion"
            width={600}
            height={300}
            className="w-full h-auto object-cover"
          />
        </div>

        {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, index) => (
                    <div key={index} className="flex flex-col items-center justify-center aspect-square border bg-card rounded-xl p-4">
                        <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-4">
                {sortedOptions.map((option, index) => (
                <Link
                    href={`/alwadi/renew?title=${encodeURIComponent(
                    option.title
                    )}&price=${option.price}`}
                    key={option.id}
                    className="group cursor-pointer transition-all duration-300 animate-in fade-in-0 zoom-in-95"
                    style={{ animationDelay: `${100 + index * 100}ms` }}
                >
                    <div className="p-4 flex flex-col items-center justify-center text-center aspect-square border bg-card rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1">
                        <div className="p-3 bg-primary/10 rounded-lg mb-3">
                            <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground/90">
                            {option.title}
                            </span>
                            <div className="flex items-baseline justify-center gap-1 mt-2 text-primary">
                            <span className="text-sm font-semibold">
                                {option.price.toLocaleString('en-US')} ريال
                            </span>
                            </div>
                        </div>
                    </div>
                </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
