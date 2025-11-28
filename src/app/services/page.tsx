'use client';

import { SimpleHeader } from '@/components/layout/simple-header';
import { Wifi } from 'lucide-react';

export default function ServicesPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="الشبكات" />
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <Wifi className="h-16 w-16 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">قيد الإنشاء</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          سيتم تفعيل هذه الميزة قريباً.
        </p>
      </div>
    </div>
  );
}
