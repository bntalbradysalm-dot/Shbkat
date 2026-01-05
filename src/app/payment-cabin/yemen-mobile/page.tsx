'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const amountPresets = [100, 200, 500, 1000, 2000];

export default function YemenMobilePage() {
  const [phoneNumber, setPhoneNumber] = useState('77');
  const [activeTab, setActiveTab] = useState('سداد');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.startsWith('77') && /^\d*$/.test(value)) {
        if (value.length <= 9) {
          setPhoneNumber(value);
        }
    } else if (value === '' || value.startsWith('7')) {
        setPhoneNumber('77');
    }
  };

  const handleAmountClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(String(amount));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && amountPresets.includes(numericValue)) {
      setSelectedAmount(numericValue);
    } else {
      setSelectedAmount(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <SimpleHeader title="رصيد وباقات" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Phone number input card */}
        <Card className="bg-red-100/30 dark:bg-red-900/30 border-red-200 dark:border-red-800">
            <CardContent className="p-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow">
                         <Image src="https://i.postimg.cc/yNZxB8js/unnamed-(1).png" alt="Yemen Mobile" width={32} height={32} />
                    </div>
                    <div className="p-2 bg-white rounded-lg shadow">
                        <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                        <Label htmlFor="phone-number" className="text-xs text-red-900 dark:text-red-200">رقم الجوال</Label>
                        <Input
                            id="phone-number"
                            type="tel"
                            value={phoneNumber}
                            onChange={handlePhoneChange}
                            className="bg-transparent border-0 text-lg font-bold p-0 h-auto text-left focus-visible:ring-0 shadow-none"
                            placeholder="77xxxxxxx"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
        
        {/* Service Type Tabs */}
        <div className="p-1 bg-muted rounded-xl grid grid-cols-4 gap-1">
            {['سداد', 'باقات', 'دفع مسبق', 'فوترة'].map(tab => (
                <Button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    variant={activeTab === tab ? 'destructive' : 'ghost'}
                    className={cn(
                        "rounded-lg",
                        activeTab === tab ? 'bg-red-600 text-white shadow' : 'text-muted-foreground'
                    )}
                    >
                    {tab}
                </Button>
            ))}
        </div>
        
        {/* Balance card */}
        <Card className="bg-red-100/30 dark:bg-red-900/30 border-red-200 dark:border-red-800">
            <CardContent className="p-3 text-center">
                 <p className="text-sm text-red-900 dark:text-red-200">الرصيد الحالي للإشتراك</p>
                 <p className="text-2xl font-bold text-red-800 dark:text-red-100 mt-1">0</p>
            </CardContent>
        </Card>
        
        {/* Amount presets */}
        <div className="grid grid-cols-5 gap-2">
            {amountPresets.map(amount => (
                <Button 
                    key={amount}
                    variant={selectedAmount === amount ? 'destructive' : 'outline'}
                    onClick={() => handleAmountClick(amount)}
                    className={cn(
                        "rounded-lg border-2",
                        selectedAmount === amount 
                            ? "bg-red-600 border-red-600 text-white" 
                            : "bg-card border-border"
                    )}
                >
                    {amount}
                </Button>
            ))}
        </div>

        {/* Custom amount input */}
        <div>
            <Label htmlFor="custom-amount">مبلغ</Label>
            <Input 
                id="custom-amount"
                type="number"
                placeholder="أدخل المبلغ"
                value={customAmount}
                onChange={handleCustomAmountChange}
                className="mt-1"
            />
        </div>

      </div>
      <div className="p-4 bg-background border-t">
            <Button className="w-full h-12 text-lg bg-red-600 hover:bg-red-700">
                سداد
            </Button>
      </div>
    </div>
  );
}
