
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, RefreshCw, ChevronLeft, Loader2, Search } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';

type UserProfile = {
  balance?: number;
};

type YemenMobileBalance = {
    mobileType: string;
    availableCredit: string;
    balance: string;
    resultDesc: string;
};

const BalanceDisplay = () => {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
    const isLoading = isUserLoading || isProfileLoading;

    return (
        <Card className="shadow-lg">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="font-medium text-muted-foreground">رصيدك الحالي</p>
                    {isLoading ? (
                        <Skeleton className="h-8 w-32 mt-2" />
                    ) : (
                        <p className="text-2xl font-bold text-primary mt-1">{(userProfile?.balance ?? 0).toLocaleString('en-US')} <span className="text-base">ريال</span></p>
                    )}
                </div>
                <Wallet className="h-8 w-8 text-primary" />
            </CardContent>
        </Card>
    );
}

const YemenMobileUI = ({ balanceData, isLoadingBalance }: { balanceData: YemenMobileBalance | null, isLoadingBalance: boolean }) => {
    return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
        <Card>
            <CardHeader className="flex-row items-center justify-between p-3">
                <CardTitle className="text-sm">باقات</CardTitle>
                <CardTitle className="text-sm">رصيد</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
                {isLoadingBalance ? (
                    <Skeleton className="h-10 w-full" />
                ) : balanceData ? (
                    <div className="flex justify-between items-center text-xs text-muted-foreground p-2 rounded-lg bg-muted">
                        <p>الرصيد: <strong>{balanceData.balance}</strong></p>
                        <p>نوع الرقم: <strong>{balanceData.mobileType === "0" ? 'دفع مسبق' : 'فاتورة'}</strong></p>
                        <p>رصيد البولار: <strong>{balanceData.availableCredit}</strong></p>
                    </div>
                ) : (
                    <p className="text-center text-xs text-destructive">لم يتم العثور على بيانات الرصيد.</p>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-3">
                <CardTitle className="text-base">الاشتراكات الحالية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-0">
                <div className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                        <p className="font-semibold text-sm">تفعيل خدمة الانترنت - شريحة (3G)</p>
                        <p className="text-xs text-muted-foreground">تاريخ الاشتراك: 2024/05/20</p>
                    </div>
                    <Button variant="ghost" size="icon"><RefreshCw className="h-5 w-5 text-primary"/></Button>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg border">
                    <div>
                        <p className="font-semibold text-sm">مزايا الشهرية - 350 دقيقة، 150 رسالة</p>
                        <p className="text-xs text-muted-foreground">تاريخ الاشتراك: 2024/06/15</p>
                    </div>
                    <Button variant="outline" size="sm">تجديد</Button>
                </div>
            </CardContent>
        </Card>
        
        <div className="space-y-2">
            {['باقات مزايا', 'باقات فورجي', 'باقات فولتي VOLTE', 'باقات الانترنت الشهرية', 'باقات الانترنت 10 ايام'].map(pkg => (
                 <Card key={pkg} className="hover:bg-muted/50 transition-colors cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
                    <CardContent className="p-3 flex items-center justify-between">
                        <p className="font-semibold">{pkg}</p>
                        <ChevronLeft className="h-5 w-5" />
                    </CardContent>
                 </Card>
            ))}
        </div>
    </div>
);
}


export default function TelecomServicesPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [detectedOperator, setDetectedOperator] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const [balanceData, setBalanceData] = useState<YemenMobileBalance | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const getOperator = (phone: string) => {
    if (phone.startsWith('77')) return 'Yemen Mobile';
    if (phone.startsWith('73')) return 'SabaFon';
    if (phone.startsWith('71')) return 'YOU';
    if (phone.startsWith('70')) return 'Way';
    return null;
  };
  
  const getOperatorLogo = (operator: string | null) => {
      switch(operator) {
          case 'Yemen Mobile': return 'https://i.postimg.cc/90FqYx0x/yemen-mobile.png';
          case 'SabaFon': return 'https://i.postimg.cc/T1j31fnC/sabafon.png';
          case 'YOU': return 'https://i.postimg.cc/SN7B5Y3z/you.png';
          case 'Way': return 'https://i.postimg.cc/j5P7qJ62/logo-W-svg.png';
          default: return null;
      }
  }
  
  const fetchBalance = useCallback(async (phone: string) => {
      if (getOperator(phone) !== 'Yemen Mobile') return;

      setIsLoadingBalance(true);
      setBalanceData(null);
      try {
          const response = await fetch(`/api/echehanly?action=query&mobile=${phone}`);
          const data = await response.json();
          if (!response.ok) {
              throw new Error(data.message || 'Failed to fetch balance');
          }
          setBalanceData(data);
      } catch (error: any) {
          console.error("Balance fetch error:", error);
          toast({ variant: 'destructive', title: 'خطأ', description: error.message });
      } finally {
          setIsLoadingBalance(false);
      }
  }, [toast]);

  useEffect(() => {
    const operator = getOperator(phoneNumber);
    if(operator !== detectedOperator) {
        setDetectedOperator(operator);
        setBalanceData(null); // Clear old data when operator changes
    }

    if (phoneNumber.length === 9) {
      if (operator === 'Yemen Mobile') {
        fetchBalance(phoneNumber);
      } else if (operator) {
        toast({ title: "قريباً", description: `خدمات ${operator} قيد التطوير.`});
      }
    }
  }, [phoneNumber, detectedOperator, fetchBalance, toast]);

  const renderOperatorUI = () => {
    switch (detectedOperator) {
      case 'Yemen Mobile':
        return <YemenMobileUI balanceData={balanceData} isLoadingBalance={isLoadingBalance}/>;
      default:
        return null;
    }
  };

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="كبينة السداد" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <BalanceDisplay />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">ادخل رقم الهاتف</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-12 flex items-center justify-center">
                    {isSearching ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : detectedOperator && getOperatorLogo(detectedOperator) ? (
                        <Image src={getOperatorLogo(detectedOperator)!} alt={detectedOperator} width={32} height={32} className="object-contain"/>
                    ) : (
                        <Search className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="7X XXX XXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="text-2xl text-center h-16 tracking-widest"
              />
            </div>
          </CardContent>
        </Card>
        
        {renderOperatorUI()}

      </div>
    </div>
    <Toaster />
    </>
  );
}
