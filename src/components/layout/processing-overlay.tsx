'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export const ProcessingOverlay = ({ message }: { message: string }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
      <div className="flex flex-col items-center justify-center gap-4">
        <Image
          src="https://i.postimg.cc/fRxDcBck/20260116-152042.png"
          alt="Processing"
          width={150}
          height={150}
          className="object-contain drop-shadow-2xl"
        />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground mt-2">{message}</p>
      </div>
    </div>
  );
};
