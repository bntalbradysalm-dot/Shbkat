
'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { AlertCircle } from 'lucide-react';

function NetworkCardsPageComponent() {
  const searchParams = useSearchParams();
  const networkName = searchParams.get('name') || 'شراء كروت';

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title={networkName} />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center text-center h-64">
          <AlertCircle className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">قيد التطوير</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            سيتم تفعيل خدمة شراء الكروت لهذه الشبكة قريباً.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NetworkCardsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NetworkCardsPageComponent />
        </Suspense>
    );
}
