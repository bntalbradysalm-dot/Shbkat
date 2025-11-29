'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Banknote, History } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type UserProfile = {
  balance?: number;
};

export default function EarningsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
    
    const isLoading = isUserLoading || isProfileLoading;
    const balance = userProfile?.balance ?? 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="الأرباح والسحب" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">رصيد الأرباح</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {isLoading ? (
                <Skeleton className="h-10 w-32 mx-auto" />
            ) : (
                <p className="text-4xl font-bold text-primary">{balance.toLocaleString('en-US')} <span className="text-lg">ريال</span></p>
            )}
            <p className="text-sm text-muted-foreground mt-1">هذا هو رصيدك القابل للسحب</p>
          </CardContent>
        </Card>
        
        <Button className="w-full h-12 text-lg">
          <Banknote className="ml-2" />
          طلب سحب الرصيد
        </Button>

        <Card>
            <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                    <History className="w-5 h-5" />
                    سجل طلبات السحب
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center text-muted-foreground py-8">
                    <p>لا توجد عمليات سحب سابقة.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
