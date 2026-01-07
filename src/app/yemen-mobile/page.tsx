'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Wifi, MessageSquare, Phone, ArrowLeft, Package } from 'lucide-react';
import Image from 'next/image';

const serviceCategories = [
  {
    title: 'باقات الإنترنت',
    icon: Wifi,
    description: 'تصفح الإنترنت بسرعات عالية مع باقات متنوعة تناسب احتياجك.',
    href: '/yemen-mobile/packages?type=internet',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    title: 'باقات التواصل الاجتماعي',
    icon: MessageSquare,
    description: 'ابق على تواصل مع أصدقائك عبر تطبيقات التواصل الاجتماعي.',
    href: '/yemen-mobile/packages?type=social',
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-500',
  },
  {
    title: 'باقات المكالمات والرسائل',
    icon: Phone,
    description: 'باقات متنوعة للمكالمات والرسائل لجميع الشبكات.',
    href: '/yemen-mobile/packages?type=voice',
    bgColor: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
  },
   {
    title: 'باقات أخرى',
    icon: Package,
    description: 'عروض وباقات إضافية متنوعة.',
    href: '/yemen-mobile/packages?type=other',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
];

export default function YemenMobilePage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="خدمات يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="mb-4 overflow-hidden rounded-xl shadow-lg bg-white flex items-center justify-center">
             <Image
                src="https://i.postimg.cc/90FqYx0x/yemen-mobile.png"
                alt="Yemen Mobile"
                width={200}
                height={100}
                className="w-auto h-24 object-contain"
            />
        </div>
        
        <div className="space-y-4">
            {serviceCategories.map((category, index) => (
                <Link href={category.href} key={category.title} className="block animate-in fade-in-0" style={{animationDelay: `${index * 100}ms`}}>
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${category.bgColor}`}>
                                    <category.icon className={`h-6 w-6 ${category.iconColor}`} />
                                </div>
                                <div>
                                    <h3 className="font-bold">{category.title}</h3>
                                    <p className="text-sm text-muted-foreground">{category.description}</p>
                                </div>
                            </div>
                             <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
