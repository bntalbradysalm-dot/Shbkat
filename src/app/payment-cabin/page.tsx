'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Wifi, Building, ArrowLeft, Archive, RefreshCw, Smile } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


type ServiceProvider = 'yemen-mobile' | 'you' | 'saba-fon' | 'yemen-4g' | 'adsl' | 'landline' | 'unknown';

const serviceConfig = {
  'yemen-mobile': {
    name: 'يمن موبايل',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '77',
    length: 9,
    color: 'bg-red-500',
    textColor: 'text-red-500',
    ringColor: 'focus-visible:ring-red-500',
    destructiveColor: 'bg-destructive hover:bg-destructive/90',
  },
   'you': {
    name: 'YOU',
    logo: 'https://i.postimg.cc/TPyC1Prn/YOU-2.png',
    prefix: '73',
    length: 9,
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    ringColor: 'focus-visible:ring-yellow-400',
    destructiveColor: 'bg-yellow-500 hover:bg-yellow-600',
  },
  'yemen-4g': {
    name: 'يمن 4G',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '10',
    length: 9,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    ringColor: 'focus-visible:ring-blue-500',
    destructiveColor: 'bg-blue-500 hover:bg-blue-600',
  },
    'adsl': {
    name: 'ADSL',
    logo: 'https://i.postimg.cc/tCFs01p9/ADSL.png',
    prefix: '05',
    length: 8,
    color: 'bg-blue-800',
    textColor: 'text-blue-800',
    ringColor: 'focus-visible:ring-blue-800',
    destructiveColor: 'bg-blue-800 hover:bg-blue-900',
  },
  'landline': {
    name: 'الهاتف الثابت',
    logo: 'https://i.postimg.cc/q73b2z3W/landline.png',
    prefix: '', // No specific prefix, maybe handle by length
    length: 7, // Assuming landline numbers are 7 digits
    color: 'bg-yellow-600',
    textColor: 'text-yellow-600',
    ringColor: 'focus-visible:ring-yellow-600',
    destructiveColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  'unknown': {
      name: 'غير معروف',
      logo: '',
      prefix: '',
      length: 9,
      color: 'bg-gray-400',
      textColor: 'text-gray-400',
      ringColor: 'focus-visible:ring-gray-400',
      destructiveColor: 'bg-gray-500 hover:bg-gray-600',
  }
};

const getProviderFromPhone = (phone: string): ServiceProvider => {
    if (phone.startsWith('77')) return 'yemen-mobile';
    if (phone.startsWith('73')) return 'you';
    if (phone.startsWith('10')) return 'yemen-4g';
    if (phone.startsWith('05') && phone.length <= 8) return 'adsl';
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
    
    const currentMaxLength = provider !== 'unknown' ? serviceConfig[provider].length : 9;
    
    const renderYemenMobilePackages = () => (
      <div className="space-y-4">
         <Card className="p-3">
          <div className="grid grid-cols-3 divide-x-reverse divide-x text-center rtl:divide-x-reverse">
            <div className="px-2">
              <p className="text-sm font-bold text-red-600">رصيد الرقم</p>
              <p className="font-bold text-lg text-blue-600 mt-1">77</p>
            </div>
            <div className="px-2">
              <p className="text-sm font-bold text-red-600">نوع الرقم</p>
              <p className="font-bold text-sm text-blue-600 mt-1">3G | دفع مسبق</p>
            </div>
            <div className="px-2">
              <p className="text-sm font-bold text-red-600 bg-orange-200 rounded-md">فحص السلفة</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                 <Smile className="h-5 w-5 text-green-600" />
                 <p className="font-bold text-sm text-green-600">غير متسلف</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Current Subscriptions Section */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <h3 className="text-center font-bold text-red-600 mb-3 bg-red-600 text-white rounded-md py-1">الاشتراكات الحالية</h3>
          <div className="space-y-3">
            <Card className="p-3 bg-card/80">
              <div className="flex items-center gap-3">
                <div className="flex-none">
                  <Button className="bg-red-600 text-white hover:bg-red-600/90 w-16 h-16 flex flex-col items-center">
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-xs mt-1">تجديد</span>
                  </Button>
                </div>
                <div className="flex-grow text-sm">
                  <p className="font-bold">تفعيل خدمة الانترنت - شريحة (3G)</p>
                  <div className="text-xs mt-1 text-muted-foreground">
                    <p className="text-green-600">الإشتراك: 09:54:37 2023-06-20</p>
                    <p className="text-red-600">الإنتهاء: 00:00:00 2037-01-01</p>
                  </div>
                </div>
              </div>
            </Card>
             <Card className="p-3 bg-card/80">
              <div className="flex items-center gap-3">
                <div className="flex-none">
                  <Button className="bg-red-600 text-white hover:bg-red-600/90 w-16 h-16 flex flex-col items-center">
                    <RefreshCw className="h-5 w-5" />
                    <span className="text-xs mt-1">تجديد</span>
                  </Button>
                </div>
                <div className="flex-grow text-sm">
                  <p className="font-bold">مزايا الشهريه - 350 دقيقه 150 رساله 250 ميجا</p>
                  <div className="text-xs mt-1 text-muted-foreground">
                    <p className="text-green-600">الإشتراك: 20:42:53 2025-12-08</p>
                    <p className="text-red-600">الإنتهاء: 23:59:59 2026-01-06</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Packages Accordion */}
         <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="item-1" className="border-0">
                <AccordionTrigger className="bg-red-600 text-white rounded-xl px-4 py-3 text-base font-bold hover:bg-red-600/90 hover:no-underline [&[data-state=open]]:rounded-b-none">
                    <div className="flex items-center justify-between w-full">
                        <span>باقات مزايا</span>
                         <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 text-sm font-bold">3G</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted p-4 rounded-b-xl">
                    سيتم عرض باقات مزايا هنا قريباً.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-0">
                <AccordionTrigger className="bg-red-600 text-white rounded-xl px-4 py-3 text-base font-bold hover:bg-red-600/90 hover:no-underline [&[data-state=open]]:rounded-b-none">
                     <div className="flex items-center justify-between w-full">
                        <span>باقات فورجي</span>
                         <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 text-sm font-bold">4G</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted p-4 rounded-b-xl">
                    سيتم عرض باقات فورجي هنا قريباً.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-0">
                <AccordionTrigger className="bg-red-600 text-white rounded-xl px-4 py-3 text-base font-bold hover:bg-red-600/90 hover:no-underline [&[data-state=open]]:rounded-b-none">
                    <div className="flex items-center justify-between w-full">
                        <span>باقات فولتي VOLTE</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 text-sm font-bold">4G</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted p-4 rounded-b-xl">
                     سيتم عرض باقات فولتي هنا قريباً.
                </AccordionContent>
            </AccordionItem>
             <AccordionItem value="item-4" className="border-0">
                <AccordionTrigger className="bg-red-600 text-white rounded-xl px-4 py-3 text-base font-bold hover:bg-red-600/90 hover:no-underline [&[data-state=open]]:rounded-b-none">
                    <div className="flex items-center justify-between w-full">
                        <span>باقات الإنترنت الشهرية</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 text-sm font-bold">↑↓</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted p-4 rounded-b-xl">
                     سيتم عرض باقات الإنترنت الشهرية هنا قريباً.
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5" className="border-0">
                <AccordionTrigger className="bg-red-600 text-white rounded-xl px-4 py-3 text-base font-bold hover:bg-red-600/90 hover:no-underline [&[data-state=open]]:rounded-b-none">
                    <div className="flex items-center justify-between w-full">
                        <span>باقات الإنترنت 10 ايام</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 text-xs font-bold p-0.5">10 MP</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="bg-muted p-4 rounded-b-xl">
                     سيتم عرض باقات الإنترنت 10 ايام هنا قريباً.
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </div>
    );


    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SimpleHeader title="كبينة السداد" />
            
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                <Card className={cn(
                    "rounded-2xl shadow-lg border-2 transition-colors duration-500",
                    provider !== 'unknown' ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
                )}>
                    <CardContent className="p-4 flex items-center gap-3">
                         {provider !== 'unknown' && (
                            <div className="p-1 bg-white rounded-lg shadow animate-in fade-in-0 zoom-in-75">
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
                                    "bg-transparent border-0 text-lg font-bold p-0 h-auto text-right focus-visible:ring-0 shadow-none focus-visible:ring-offset-0",
                                    provider !== 'unknown' ? serviceConfig[provider].ringColor : ''
                                )}
                                placeholder="أدخل رقم الجوال"
                                maxLength={currentMaxLength}
                            />
                        </div>
                         <div className="p-2 bg-white rounded-lg shadow-sm">
                            <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>

                {provider === 'yemen-mobile' && (
                    <div className="space-y-4 animate-in fade-in-0 duration-500">
                        <div className="grid grid-cols-4 bg-muted p-1 rounded-xl">
                            {['فوترة', 'دفع مسبق', 'باقات', 'سداد'].map((tab) => (
                               <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "text-xs py-1.5 rounded-lg transition-colors",
                                    activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                                )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                         {activeTab === 'باقات' && renderYemenMobilePackages()}

                         {activeTab === 'دفع مسبق' && (
                            <div className="space-y-4">
                                <Card className="rounded-2xl shadow-lg border-2 border-red-500/20 bg-red-500/5 text-center">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-red-500/80">الرصيد الحالي للإشتراك</p>
                                        <p className="text-3xl font-bold text-red-500 mt-1">0</p>
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
                                                selectedAmount === amount && `bg-red-500 hover:bg-red-500/90 border-red-500 text-white`
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
                        
                        {(activeTab === 'سداد' || activeTab === 'فوترة') && (
                            <div className="text-center text-muted-foreground py-10">
                                <p>سيتم تفعيل هذه الميزة قريباً.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {provider === 'yemen-mobile' && activeTab === 'دفع مسبق' && (
                <div className="p-4 bg-background border-t shadow-inner sticky bottom-0">
                    <Button 
                        className={cn("w-full h-12 text-lg font-bold", serviceConfig[provider]?.destructiveColor || 'bg-destructive')}
                        disabled={finalAmount <= 0}
                    >
                        سداد
                    </Button>
                </div>
            )}
        </div>
    );
}
