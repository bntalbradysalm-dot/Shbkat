'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, CreditCard } from 'lucide-react';

export default function RenewPage() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title');
  const price = searchParams.get('price');

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title={title || 'تجديد الاشتراك'} />
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">{title}</CardTitle>
            {price && (
              <p className="text-center text-2xl font-bold text-primary">
                {Number(price).toLocaleString('en-US')} ريال
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="subscriberName"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  اسم المشترك
                </Label>
                <Input
                  id="subscriberName"
                  type="text"
                  placeholder="ادخل اسم المشترك"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  رقم الكرت
                </Label>
                <Input
                  id="cardNumber"
                  type="text"
                  inputMode="numeric"
                  placeholder="ادخل رقم الكرت"
                />
              </div>
              <Button type="submit" className="w-full">
                تأكيد التجديد
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
