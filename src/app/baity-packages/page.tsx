'use client';

import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

export default function BaityPackagesPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="باقات بيتي" />
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-muted rounded-full">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold">قريباً...</h2>
            <p className="text-muted-foreground mt-2">
              هذه الخدمة قيد الإنشاء حالياً وسيتم تفعيلها قريباً.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
