'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Wifi, Building, Heart, HelpCircle, Users, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ServiceProvider = 'yemen-mobile' | 'you' | 'saba-fon' | 'yemen-4g' | 'adsl' | 'landline' | 'unknown';

const serviceConfig = {
  'yemen-mobile': {
    name: 'يمن موبايل',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '77',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    ringColor: 'focus-visible:ring-red-500',
  },
   'you': {
    name: 'YOU',
    logo: 'https://i.postimg.cc/TPyC1Prn/YOU-2.png',
    prefix: '73',
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    ringColor: 'focus-visible:ring-yellow-400',
  },
  'yemen-4g': {
    name: 'يمن 4G',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '10', // Example prefix
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    ringColor: 'focus-visible:ring-blue-500',
  },
    'adsl': {
    name: 'ADSL',
    logo: 'https://i.postimg.cc/tCFs01p9/ADSL.png',
    prefix: '05', // Example prefix
    color: 'bg-blue-800',
    textColor: 'text-blue-800',
    ringColor: 'focus-visible:ring-blue-800',
  },
  'landline': {
    name: 'الهاتف الثابت',
    logo: 'https://i.postimg.cc/q73b2z3W/landline.png',
    prefix: '', // Example prefix
    color: 'bg-yellow-600',
    textColor: 'text-yellow-600',
    ringColor: 'focus-visible:ring-yellow-600',
  },
  'unknown': {
      name: 'غير معروف',
      logo: '',
      prefix: '',
      color: 'bg-gray-400',
      textColor: 'text-gray-400',
      ringColor: 'focus-visible:ring-gray-400',
  }
};

const getProviderFromPhone = (phone: string): ServiceProvider => {
    if (phone.startsWith('77')) return 'yemen-mobile';
    if (phone.startsWith('73')) return 'you';
    if (phone.startsWith('10')) return 'yemen-4g';
    if (phone.startsWith('05')) return 'adsl';
    // Add more rules here
    return 'unknown';
};

const predefinedAmounts = [2000, 1000, 500, 200, 100];


export default function PaymentCabinPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [provider, setProvider] = useState<ServiceProvider>('unknown');
    const [activeTab, setActiveTab] = useState('دفع مسبق');
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

    useEffect(() => {
        const detectedProvider = getProviderFromPhone(phoneNumber);
        setProvider(detectedProvider);
    }, [phoneNumber]);

    const handleAmountButtonClick = (amount: number) => {
        setSelectedAmount(amount);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomAmount(value);
        if (value !== '') {
            setSelectedAmount(null);
        }
    };
    
    const finalAmount = selectedAmount !== null ? selectedAmount : (customAmount ? parseFloat(customAmount) : 0);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {provider === 'unknown' ? (
                 <SimpleHeader title="كبينة السداد" />
            ) : (
                <header className="flex items-center justify-between p-4 bg-transparent text-foreground">
                    <div className='flex items-center gap-2'>
                        <Button variant="ghost" size="icon"><Heart className="h-6 w-6 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon"><HelpCircle className="h-6 w-6 text-muted-foreground" /></Button>
                    </div>
                    <h1 className="font-bold text-lg text-center">رصيد وباقات</h1>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                </header>
            )}

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                <Card className="rounded-2xl shadow-lg border-2 border-primary/20 bg-primary/5">
                    <CardContent className="p-4 flex items-center gap-3">
                         {provider !== 'unknown' && (
                            <div className="p-1 bg-white rounded-lg shadow">
                                <Image
                                    src={serviceConfig[provider].logo}
                                    alt={serviceConfig[provider].name}
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                />
                            </div>
                        )}
                        <div className="relative flex-grow">
                             <Input
                                id="phone-number"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className={cn(
                                    "bg-transparent border-0 text-lg font-bold p-0 h-auto pr-10 text-right focus-visible:ring-0 shadow-none focus-visible:ring-offset-0",
                                    provider !== 'unknown' ? serviceConfig[provider].ringColor : ''
                                )}
                                placeholder="أدخل رقم الجوال"
                                maxLength={9}
                            />
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-sm">
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {provider === 'yemen-mobile' && (
                    <div className="space-y-4 animate-in fade-in-0 duration-500">
                        <Tabs defaultValue="دفع مسبق" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-primary/5 p-1 h-auto">
                                <TabsTrigger value="سداد" className="text-xs">سداد</TabsTrigger>
                                <TabsTrigger value="باقات" className="text-xs">باقات</TabsTrigger>
                                <TabsTrigger value="دفع مسبق" className="text-xs">دفع مسبق</TabsTrigger>
                                <TabsTrigger value="فوترة" className="text-xs">فوترة</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        
                        <Card className="rounded-2xl shadow-lg border-2 border-destructive/20 bg-destructive/5 text-center">
                            <CardContent className="p-4">
                                <p className="text-sm text-destructive/80">الرصيد الحالي للإشتراك</p>
                                <p className="text-3xl font-bold text-destructive mt-1">0</p>
                            </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-5 gap-2">
                           {predefinedAmounts.map(amount => (
                               <Button 
                                    key={amount} 
                                    variant={selectedAmount === amount ? "default" : "outline"}
                                    onClick={() => handleAmountButtonClick(amount)}
                                    className={cn(
                                        "h-12 text-sm font-bold rounded-xl",
                                        selectedAmount === amount && `bg-destructive hover:bg-destructive/90 border-destructive text-white`
                                    )}
                               >
                                   {amount}
                               </Button>
                           ))}
                        </div>

                        <div>
                            <Label htmlFor="customAmount" className="text-muted-foreground mb-1 block text-right">مبلغ</Label>
                            <Input 
                                id="customAmount"
                                type="number" 
                                placeholder="أدخل المبلغ"
                                value={customAmount}
                                onChange={handleCustomAmountChange}
                                className="h-14 text-lg text-center"
                            />
                        </div>
                    </div>
                )}
            </div>

            {provider === 'yemen-mobile' && (
                <div className="p-4 bg-background border-t shadow-inner">
                    <Button 
                        className="w-full h-12 text-lg font-bold bg-destructive hover:bg-destructive/90" 
                        disabled={finalAmount <= 0}
                    >
                        سداد
                    </Button>
                </div>
            )}
        </div>
    );
}
