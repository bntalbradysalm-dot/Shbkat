'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bolt, ChevronLeft, Droplets } from 'lucide-react';
import Link from 'next/link';

const paymentServices = [
    {
        title: 'فواتير الكهرباء',
        description: 'استعلم وادفع فواتير الكهرباء بسهولة.',
        icon: Bolt,
        href: '/payments/electricity',
        theme: 'bg-yellow-400/10 text-yellow-500'
    },
    {
        title: 'فواتير المياه',
        description: 'استعلم وادفع فواتير المياه.',
        icon: Droplets,
        href: '/payments/water',
        theme: 'bg-blue-400/10 text-blue-500'
    }
];

export default function PaymentsPage() {
    return (
        <div className="flex flex-col h-full bg-background">
            <SimpleHeader title="المدفوعات" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">خدمات الدفع</CardTitle>
                        <CardDescription className="text-center">اختر خدمة من القائمة أدناه.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {paymentServices.map((service, index) => {
                            const Icon = service.icon;
                            return (
                                <Link href={service.href} key={index}>
                                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                        <CardContent className="p-4 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${service.theme}`}>
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-base">{service.title}</p>
                                                    <p className="text-sm text-muted-foreground">{service.description}</p>
                                                </div>
                                            </div>
                                            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
