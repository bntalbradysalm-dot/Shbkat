'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, User as UserIcon, Wallet, Send, Building } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type UserProfile = {
  balance?: number;
};

type PaymentMethod = {
    id: string;
    name: string;
    logoUrl?: string;
    accountHolderName: string;
    accountNumber: string;
};

const getLogoSrc = (url?: string) => {
    if (url && (url.startsWith('http') || url.startsWith('/'))) {
      return url;
    }
    return 'https://placehold.co/100x100/e2e8f0/e2e8f0'; 
};

export default function WithdrawPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
    const [recipientName, setRecipientName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [amount, setAmount] = useState('');

    const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const methodsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'paymentMethods') : null),
        [firestore]
    );
    const { data: allWithdrawalMethods, isLoading: isLoadingMethods } = useCollection<PaymentMethod>(methodsCollection);
    
    const withdrawalMethods = useMemo(() => {
        if (!allWithdrawalMethods) return [];
        const allowedNames = ["بنك الكريمي", "شركة العمقي للصرافة"];
        return allWithdrawalMethods.filter(method => allowedNames.includes(method.name));
    }, [allWithdrawalMethods]);

    useEffect(() => {
        if (!selectedMethodId && withdrawalMethods && withdrawalMethods.length > 0) {
            setSelectedMethodId(withdrawalMethods[0].id);
        }
    }, [withdrawalMethods, selectedMethodId]);

    const isLoading = isUserLoading || isProfileLoading || isLoadingMethods;
    const balance = userProfile?.balance ?? 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="سحب" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <p className="font-semibold text-muted-foreground">رصيدك من الأرباح</p>
            </div>
            {isLoading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <p className="text-2xl font-bold text-primary">{balance.toLocaleString('en-US')} <span className="text-sm">ريال يمني</span></p>
            )}
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-center">اختر طريقة السحب</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                {isLoadingMethods ? (
                    <>
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </>
                ) : (
                    withdrawalMethods?.map((method) => (
                         <div
                            key={method.id}
                            onClick={() => setSelectedMethodId(method.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2 rounded-xl p-4 aspect-square cursor-pointer transition-all border-2",
                                selectedMethodId === method.id
                                    ? 'border-primary shadow-lg bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                            )}
                        >
                            <Image src={getLogoSrc(method.logoUrl)} alt={method.name} width={56} height={56} className="rounded-lg object-contain" />
                            <p className="text-center text-xs font-semibold mt-2">{method.name}</p>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-center">تفاصيل السحب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="recipientName" className="flex items-center gap-2 mb-1">
                        <UserIcon className="h-4 w-4" />
                        اسم المستلم
                    </Label>
                    <Input id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="الاسم الكامل كما في الحساب البنكي" />
                </div>
                 <div>
                    <Label htmlFor="accountNumber" className="flex items-center gap-2 mb-1">
                        <Building className="h-4 w-4" />
                        رقم حساب المستلم
                    </Label>
                    <Input id="accountNumber" type="number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="ادخل رقم الحساب" />
                </div>
                 <div>
                    <Label htmlFor="amount" className="flex items-center gap-2 mb-1">
                        <Banknote className="h-4 w-4" />
                        المبلغ المراد سحبه
                    </Label>
                    <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                </div>
            </CardContent>
        </Card>

        <Button className="w-full h-12 text-lg">
          <Send className="ml-2" />
          تأكيد السحب
        </Button>
      </div>
    </div>
  );
}
