'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Phone, Mail, Globe, Wifi } from 'lucide-react';
import Image from 'next/image';

const PackageCard = ({
    packageName,
    paymentType,
    sliceType,
    price,
    validity,
    minutes,
    messages,
    data,
    logo,
}:{
    packageName: string;
    paymentType: string;
    sliceType: string;
    price: string;
    validity: string;
    minutes: string;
    messages: string;
    data: string;
    logo: string;
}) => (
  <Card className="relative overflow-hidden rounded-2xl border-2 border-red-200/50 bg-orange-50/50 shadow-lg">
    <div className="absolute top-4 left-4 z-10 bg-white p-2 rounded-xl shadow-md">
      <Image src={logo} alt="Yemen Mobile" width={40} height={40} className="object-contain" />
    </div>
    <CardContent className="p-6 pt-12 text-center">
      <h3 className="text-xl font-bold text-red-700">{packageName}</h3>
      <div className="mt-2 flex justify-center items-center gap-4">
        <span className="font-semibold text-gray-800">{paymentType}</span>
        <span className="text-gray-500">{sliceType}</span>
      </div>
      <p className="my-4 text-5xl font-bold text-gray-800" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
        {price}
      </p>
    </CardContent>
    <div className="grid grid-cols-4 divide-x-reverse divide-x border-t border-red-200/50 bg-white/50 rtl:divide-x-reverse">
        <div className="flex flex-col items-center justify-center p-3 text-center">
            <Globe className="h-6 w-6 text-gray-600 mb-1" />
            <span className="text-sm font-semibold">{data}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 text-center">
            <Mail className="h-6 w-6 text-gray-600 mb-1" />
            <span className="text-sm font-semibold">{messages}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 text-center">
            <Phone className="h-6 w-6 text-gray-600 mb-1" />
            <span className="text-sm font-semibold">{minutes}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 text-center">
            <Clock className="h-6 w-6 text-gray-600 mb-1" />
            <span className="text-sm font-semibold">{validity}</span>
        </div>
    </div>
  </Card>
);

export default function Yemen4GPage() {
    const [phoneNumber, setPhoneNumber] = useState('');

    const packages = [
        {
            packageName: "باقة مزايا فورجي الاسبوعية",
            paymentType: "دفع مسبق",
            sliceType: "شريحة",
            price: "1500",
            validity: "7 أيام",
            minutes: "200 دقيقة",
            messages: "300 رسالة",
            data: "2 جيجا",
            logo: "https://i.postimg.cc/yNZxB8js/unnamed-(1).png"
        },
    ];

    return (
        <div className="flex flex-col h-full bg-background">
            <SimpleHeader title="يمن 4G" />
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <Card>
                    <CardContent className="p-4">
                        <Label htmlFor="phone-number" className="text-right block mb-2 font-semibold">تعبئة رصيد يمن 4G</Label>
                        <div className='flex gap-2'>
                           <Input
                             id="phone-number"
                             type="tel"
                             value={phoneNumber}
                             onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                             placeholder="ادخل رقم المستفيد"
                             maxLength={9}
                             className="text-left"
                           />
                           <Button>تعبئة</Button>
                        </div>
                    </CardContent>
                </Card>
                
                <Tabs defaultValue="packages" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="packages">الباقات</TabsTrigger>
                        <TabsTrigger value="services">خدمات أخرى</TabsTrigger>
                    </TabsList>
                    <TabsContent value="packages" className="pt-4 space-y-4">
                       {packages.map((pkg, index) => (
                           <PackageCard key={index} {...pkg} />
                       ))}
                    </TabsContent>
                    <TabsContent value="services" className="pt-4 text-center text-muted-foreground">
                        <p>سيتم إضافة الخدمات الأخرى قريباً.</p>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
