'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Contact, Wallet, Phone, RefreshCw } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";


type Transaction = {
    id: string;
    transactionType: string;
    recipientPhoneNumber?: string;
};

type Company = {
  name: string;
  icon: string | React.ElementType;
  theme: string;
};

const companyMap: Record<string, Company> = {
    'yemen-mobile': {
        name: 'يمن موبايل',
        icon: 'https://i.postimg.cc/52nxCtk5/images.png',
        theme: 'yemen-mobile'
    },
};


type UserProfile = {
    balance?: number;
};

const getCompanyFromNumber = (phone: string): Company | null => {
  if (!phone || phone.length !== 9) return null;

  if (phone.startsWith('77') || phone.startsWith('78')) {
      return companyMap['yemen-mobile'];
  }
  
  return null;
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

const YemenMobileUI = ({ phoneNumber }: { phoneNumber: string }) => {

    const subscriptions = [
        { name: 'تفعيل خدمة الانترنت - شريحة (3G)', subscribedAt: '21:23:47 2022-07-07', expiresAt: '00:00:00 2037-01-01', canRenew: true },
        { name: 'تفعيل خدمة الانترنت (4G)', subscribedAt: '19:35:51 2023-07-19', expiresAt: '00:00:00 2037-01-01', canRenew: false },
        { name: 'Internet', subscribedAt: '19:35:51 2023-07-19', expiresAt: '00:00:00 2037-01-01', canRenew: false },
        { name: 'باقة مزايا فورجي الشهرية', subscribedAt: '19:36:37 2025-12-17', expiresAt: '23:59:59 2026-01-15', canRenew: true },
    ];


    return (
        <div className="space-y-4 animate-in fade-in-0 duration-500">
             <Tabs defaultValue="balance" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="balance">الرصيد</TabsTrigger>
                    <TabsTrigger value="packages">الباقات</TabsTrigger>
                </TabsList>
                <TabsContent value="balance" className="mt-4">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                             <div>
                                <Label htmlFor="amount" className="text-muted-foreground">ادخل المبلغ</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    inputMode='numeric'
                                    placeholder="0.00"
                                />
                             </div>
                             <Button className="w-full">
                                تسديد
                             </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="packages" className="mt-4 space-y-4">
                     <Card>
                        <CardContent className="p-0 divide-y divide-border">
                            <div className="flex justify-around items-start text-center p-3 text-sm">
                                <div className="flex-1 space-y-1">
                                    <p className="text-muted-foreground text-xs">رصيد الرقم</p>
                                    <p className="font-bold text-primary dark:text-primary-foreground text-base">411.00</p>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-muted-foreground text-xs">نوع الرقم</p>
                                    <p className="font-semibold text-primary dark:text-primary-foreground text-sm">دفع مسبق</p>
                                </div>
                            </div>
                            <div className="p-3 text-center">
                                <div className="flex-1 space-y-1">
                                    <p className="text-muted-foreground text-xs">حالة السلفة</p>
                                    <p className="font-semibold text-primary dark:text-primary-foreground text-sm">غير متسلف</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-0">
                            <div className="bg-muted text-foreground text-center font-bold p-2 text-sm">
                                الاشتراكات الحالية
                            </div>
                            <div className="p-3 space-y-3">
                                {subscriptions.map((sub, index) => (
                                    <Card key={index} className="bg-muted/50 p-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex-1 text-right">
                                                <p className="font-bold text-sm">{sub.name}</p>
                                                <p className="text-xs text-green-600 mt-1">الإشتراك: {sub.subscribedAt}</p>
                                                <p className="text-xs text-red-600">الإنتهاء: {sub.expiresAt}</p>
                                            </div>
                                            {sub.canRenew && (
                                                <div className="text-center ml-2">
                                                    <Button variant="ghost" className="h-12 w-12 rounded-full flex flex-col items-center justify-center bg-primary/10 hover:bg-primary/20">
                                                        <RefreshCw className="h-5 w-5 text-primary" />
                                                    </Button>
                                                    <span className="text-xs font-semibold text-primary">تجديد</span>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Accordion type="single" collapsible className="w-full space-y-3">
                    <AccordionItem value="item-1" className="border-0">
                        <AccordionTrigger className="p-3 bg-primary text-primary-foreground rounded-lg hover:no-underline hover:bg-primary/90">
                            <div className="flex justify-between items-center w-full">
                            <span className="font-bold">باقات مزايا</span>
                            <div className="bg-white/30 text-white rounded-md px-2 py-1 text-xs font-bold">3G</div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 bg-card mt-2 rounded-lg">
                            محتوى باقات مزايا هنا.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="border-0">
                        <AccordionTrigger className="p-3 bg-primary text-primary-foreground rounded-lg hover:no-underline hover:bg-primary/90">
                            <div className="flex justify-between items-center w-full">
                            <span className="font-bold">باقات فورجي</span>
                            <div className="bg-white/30 text-white rounded-md px-2 py-1 text-xs font-bold">4G</div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 bg-card mt-2 rounded-lg">
                            محتوى باقات فورجي هنا.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3" className="border-0">
                        <AccordionTrigger className="p-3 bg-primary text-primary-foreground rounded-lg hover:no-underline hover:bg-primary/90">
                            <div className="flex justify-between items-center w-full">
                            <span className="font-bold">باقات فولتي VOLTE</span>
                            <div className="bg-white/30 text-white rounded-md px-2 py-1 text-xs font-bold">4G</div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-3 bg-card mt-2 rounded-lg">
                            محتوى باقات فولتي هنا.
                        </AccordionContent>
                    </AccordionItem>
                    </Accordion>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default function TelecomPage() {
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [identifiedCompany, setIdentifiedCompany] = React.useState<Company | null>(null);
  const [isUiVisible, setIsUiVisible] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  
  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(
    () => user ? query(
        collection(firestore, `users/${user.uid}/transactions`),
        where('transactionType', 'in', ['سداد يمن موبايل', 'سداد YOU', 'سداد سبأفون'])
    ) : null,
    [user, firestore]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const frequentNumbers = useMemo(() => {
    if (!transactions) return [];

    const counts: { [key: string]: number } = {};
    transactions.forEach(tx => {
        if(tx.recipientPhoneNumber) {
            counts[tx.recipientPhoneNumber] = (counts[tx.recipientPhoneNumber] || 0) + 1;
        }
    });

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([phone]) => phone)
        .slice(0, 5); // Get top 5
  }, [transactions]);

  const handleSelectFavorite = (phone: string) => {
    setPhoneNumber(phone);
    setIsFavoritesOpen(false);
  };
  
  React.useEffect(() => {
    // Reset when phone number is cleared
    if (phoneNumber.length === 0) {
      setIsUiVisible(false);
      setIdentifiedCompany(null);
    } else {
        const company = getCompanyFromNumber(phoneNumber);
        setIdentifiedCompany(company);
        if(company) {
            setIsUiVisible(true);
        } else {
            setIsUiVisible(false);
        }
    }
  }, [phoneNumber]);

  return (
    <div
      className="flex flex-col h-full bg-background"
    >
      <SimpleHeader title="رصيد وباقات" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        <BalanceDisplay />

        <Card>
            <CardContent className="p-3 space-y-1">
                <p className="text-right font-semibold text-xs text-muted-foreground px-1">ادخل رقم الهاتف :</p>
                <div className="flex items-center gap-1 rounded-xl bg-muted p-1 border">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Contact className="h-5 w-5 text-primary" />
                    </Button>
                    <div className="relative flex-1">
                        <Input
                            id="phone-number"
                            type="tel"
                            placeholder="7xxxxxxxx"
                            className="h-10 text-lg font-bold tracking-wider rounded-lg border-0 bg-transparent text-right focus-visible:ring-0 focus-visible:ring-offset-0 pr-1"
                            value={phoneNumber}
                            onChange={(e) =>
                                setPhoneNumber(e.target.value.replace(/\D/g, ''))
                            }
                        />
                    </div>
                    <div className="h-6 w-px bg-border"></div>
                     <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Phone className="h-4 w-4 text-primary" />
                    </Button>
                     <Dialog open={isFavoritesOpen} onOpenChange={setIsFavoritesOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Heart className="h-4 w-4 text-primary" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>الارقام المفضلة</DialogTitle>
                                <DialogDescription>
                                    يتم اضافة الارقام الاكثر تسديد تلقائياً
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                {frequentNumbers.length > 0 ? (
                                    <div className="space-y-2">
                                        {frequentNumbers.map(phone => (
                                            <div key={phone} onClick={() => handleSelectFavorite(phone)} className="p-3 rounded-lg bg-muted hover:bg-primary/10 cursor-pointer flex justify-between items-center">
                                                <span className="font-mono font-semibold">{phone}</span>
                                                
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground">لا توجد أرقام متكررة في سجل عملياتك.</p>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">إغلاق</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
        
        {isUiVisible && identifiedCompany?.name === 'يمن موبايل' && <YemenMobileUI phoneNumber={phoneNumber} />}
        
      </div>
    </div>
  );
}