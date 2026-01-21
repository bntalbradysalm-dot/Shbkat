'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function YouServicesPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="خدمات YOU" />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">قريباً</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Construction className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              هذه الخدمة قيد التطوير حاليًا وستكون متاحة في أقرب وقت.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
