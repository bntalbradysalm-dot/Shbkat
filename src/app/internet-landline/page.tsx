'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Phone, Wifi, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function InternetLandlinePage() {
    const [phone, setPhone] = useState('');
    const [activeTab, setActiveTab] = useState("adsl");
    const router = useRouter();
    const { toast } = useToast();

    const handleSearch = () => {
        if (!phone) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'الرجاء إدخال رقم للاستعلام عنه.'
            });
            return;
        }
        
        const type = activeTab === 'adsl' ? 'adsl' : 'line';
        router.push(`/landline-services?phone=${phone}&type=${type}`);
    }

    return (
        <>
            <div className="flex flex-col h-full bg-background">
                <SimpleHeader title="الهاتف الثابت و ADSL" />
                <div className="flex-1 overflow-y-auto p-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center">استعلام وسداد</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="adsl"><Wifi className="ml-2 h-4 w-4" /> ADSL</TabsTrigger>
                                    <TabsTrigger value="landline"><Phone className="ml-2 h-4 w-4" /> هاتف ثابت</TabsTrigger>
                                </TabsList>
                            </Tabs>
                             <div className="space-y-4 pt-6">
                                <div>
                                <Label htmlFor="phone" className="flex items-center gap-2 mb-1">
                                    <Phone className="h-4 w-4" />
                                    {activeTab === 'adsl' ? 'رقم الهاتف المرتبط بالخدمة' : 'رقم الهاتف الثابت'}
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    inputMode='numeric'
                                    placeholder="0xxxxxxx"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    className="text-right font-semibold"
                                />
                                </div>
                                <Button onClick={handleSearch} className="w-full">
                                    <Search className="ml-2 h-4 w-4" />
                                    استعلام
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Toaster />
        </>
    );
}
