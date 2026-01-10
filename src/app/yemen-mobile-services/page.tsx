'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Settings, User, Phone, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
    balance?: number;
};

const CustomHeader = () => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const isLoading = isUserLoading || isProfileLoading;

    return (
        <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
            <button className="p-2 rounded-full bg-white/20">
                <RefreshCw className="h-5 w-5" />
            </button>
            <div className="text-center">
                {isLoading ? (
                    <Skeleton className="h-6 w-24 bg-white/30" />
                ) : (
                    <span className="text-xl font-bold">رصيدي {userProfile?.balance?.toLocaleString('en-US') ?? 0}</span>
                )}
            </div>
            <button className="p-2 rounded-full bg-white/20">
                <Settings className="h-5 w-5" />
            </button>
        </div>
    );
};

export default function YemenMobileServicesPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [useNorthGateway, setUseNorthGateway] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-background">
            <CustomHeader />
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="flex items-center justify-center my-4">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="px-4 text-sm font-semibold text-muted-foreground">تسديد شبكات الاتصالات اليمنية</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <div className='space-y-2'>
                    <Label htmlFor="phone-input" className="text-sm font-medium pr-1">ادخل رقم الهاتف :</Label>
                    <Card className='shadow-md'>
                        <CardContent className="p-2">
                             <div className="relative flex items-center">
                                <div className='p-2'>
                                    <User className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <span className="pl-2 pr-1 text-muted-foreground font-semibold">+967</span>
                                <Input
                                    id="phone-input"
                                    type="tel"
                                    placeholder="رقم الهاتف"
                                    className="border-0 text-right text-lg flex-1 !ring-0 !shadow-none p-0"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                    maxLength={9}
                                />
                                <div className="flex items-center">
                                    <div className='p-2 border-r'>
                                        <Phone className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className='p-2'>
                                        <Heart className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <Card className='shadow-md'>
                    <CardContent className="p-3 flex items-center justify-between">
                        <Label htmlFor="gateway-switch" className="text-base font-semibold">
                            بوابة الشمال
                        </Label>
                        <Switch
                            id="gateway-switch"
                            checked={useNorthGateway}
                            onCheckedChange={setUseNorthGateway}
                        />
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
