'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Wifi, Building } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

type Service = 'yemen-mobile' | 'you' | 'yemen-4g' | 'adsl' | 'landline';

const serviceConfig = {
  'yemen-mobile': {
    name: 'يمن موبايل',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '77',
    maxLength: 9,
    color: 'red',
  },
  'you': {
    name: 'YOU',
    logo: 'https://i.postimg.cc/TPyC1Prn/YOU-2.png',
    prefix: '73',
    maxLength: 9,
    color: 'yellow',
  },
  'yemen-4g': {
    name: 'يمن 4G',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '10',
    maxLength: 9,
    color: 'blue',
  },
  'adsl': {
    name: 'ADSL',
    logo: 'https://i.postimg.cc/tCFs01p9/ADSL.png',
    prefix: '05',
    maxLength: 8,
    color: 'dark-blue',
  },
  'landline': {
    name: 'الهاتف الثابت',
    logo: 'https://i.postimg.cc/q73b2z3W/landline.png',
    prefix: '',
    maxLength: 8,
    color: 'yellow-dark',
  },
};

const serviceColors = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-500',
    'dark-blue': 'bg-blue-800',
    'yellow-dark': 'bg-yellow-500',
};

const serviceRingColors = {
    red: 'focus-visible:ring-red-500',
    yellow: 'focus-visible:ring-yellow-400',
    blue: 'focus-visible:ring-blue-500',
    'dark-blue': 'focus-visible:ring-blue-800',
    'yellow-dark': 'focus-visible:ring-yellow-500',
};


export default function PaymentCabinPage() {
    const [activeService, setActiveService] = useState<Service>('yemen-mobile');
    const [phoneNumber, setPhoneNumber] = useState(serviceConfig['yemen-mobile'].prefix);
    const [isLandline, setIsLandline] = useState(false);

    const currentConfig = isLandline ? serviceConfig['landline'] : serviceConfig[activeService];

    const handleServiceChange = (service: Service) => {
        setIsLandline(false); // Reset landline switch when changing main service
        setActiveService(service);
        const config = serviceConfig[service];
        setPhoneNumber(config.prefix);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Allow only digits
        if (!value.startsWith(currentConfig.prefix)) {
            setPhoneNumber(currentConfig.prefix);
        } else if (value.length <= currentConfig.maxLength) {
            setPhoneNumber(value);
        }
    };
    
    const handleAdslLandlineToggle = (checked: boolean) => {
        setIsLandline(checked);
        const newConfig = checked ? serviceConfig['landline'] : serviceConfig['adsl'];
        setActiveService('adsl'); // Keep the tab on ADSL
        setPhoneNumber(newConfig.prefix);
    };


    const renderPhoneNumberInput = () => {
        return (
            <Card className="rounded-2xl shadow-lg">
                <CardContent className="p-4">
                    <Label htmlFor="phone-number" className="text-sm text-muted-foreground">رقم الجوال</Label>
                    <div className="relative mt-1">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            id="phone-number"
                            type="tel"
                            value={phoneNumber}
                            onChange={handlePhoneChange}
                            className={cn(
                                "bg-transparent border-0 text-lg font-bold p-0 h-auto pr-10 text-right focus-visible:ring-0 shadow-none focus-visible:ring-offset-0",
                                serviceRingColors[currentConfig.color]
                            )}
                            placeholder={`ادخل الرقم`}/>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
  return (
    <div className="flex flex-col h-screen bg-background">
      <SimpleHeader title="كبينة السداد" />
      <div className="p-2 bg-muted/50">
        <div className="grid grid-cols-5 gap-1">
            {(Object.keys(serviceConfig) as Service[]).filter(s => s !== 'landline').map(key => (
                <button
                    key={key}
                    onClick={() => handleServiceChange(key)}
                    className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                        activeService === key && !isLandline ? 'bg-background shadow' : 'opacity-70'
                    )}
                >
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                         serviceColors[serviceConfig[key].color]
                    )}>
                        <Image src={serviceConfig[key].logo} alt={serviceConfig[key].name} width={24} height={24} className="object-contain" />
                    </div>
                    <span className="text-xs font-semibold">{serviceConfig[key].name}</span>
                </button>
            ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {renderPhoneNumberInput()}

        {(activeService === 'adsl' || isLandline) && (
            <Card className="p-4 animate-in fade-in-0">
                <div className="flex items-center justify-between">
                    <Label htmlFor="service-toggle" className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-full", isLandline ? 'bg-yellow-500' : 'bg-blue-800')}>
                            {isLandline ? <Building className="h-5 w-5 text-white" /> : <Wifi className="h-5 w-5 text-white" />}
                        </div>
                        <span className="font-semibold">{isLandline ? 'الهاتف الثابت' : 'الإنترنت ADSL'}</span>
                    </Label>
                    <Switch
                        id="service-toggle"
                        checked={isLandline}
                        onCheckedChange={handleAdslLandlineToggle}
                    />
                </div>
            </Card>
        )}

      </div>
      <div className="p-4 bg-background border-t">
            <Button className="w-full h-12 text-lg">
                استعلام
            </Button>
      </div>
    </div>
  );
}
