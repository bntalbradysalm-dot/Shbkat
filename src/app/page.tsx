
'use client';

import { BalanceCard } from '@/components/dashboard/balance-card';
import { ServiceGrid } from '@/components/dashboard/service-grid';
import { Header } from '@/components/layout/header';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, Banknote } from 'lucide-react';
import { PromotionalImage } from '@/components/dashboard/promotional-image';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';

type UserProfile = {
  accountType?: 'user' | 'network-owner';
};

const OwnerDashboard = () => (
  <div className="relative bg-card rounded-t-3xl pt-2 pb-4">
      <div className="px-4 pt-6 animate-in fade-in-0 duration-500">
          <div className="flex justify-between items-center mb-3 px-2">
              <h3 className="text-md font-bold">لوحة تحكم مالك الشبكة</h3>
          </div>
      </div>
      <div className="grid grid-cols-2 gap-4 px-4 py-2">
          <Link href="/my-network/manage">
              <Card className="p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors text-center">
                  <Wifi className="w-10 h-10 text-primary" />
                  <p className="font-bold">إدارة شبكتي</p>
                  <p className="text-xs text-muted-foreground">الفئات والكروت</p>
              </Card>
          </Link>
          <Link href="/my-network/withdraw">
              <Card className="p-4 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors text-center">
                  <Banknote className="w-10 h-10 text-primary" />
                  <p className="font-bold">سحب</p>
                  <p className="text-xs text-muted-foreground">سحب الارباح</p>
              </Card>
          </Link>
      </div>
       <div className="pt-4">
        <ServiceGrid />
        <PromotionalImage />
        <RecentTransactions />
      </div>
  </div>
);

const UserDashboard = () => (
  <>
    <ServiceGrid />
    <PromotionalImage />
    <RecentTransactions />
  </>
);


export default function Home() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

  if (isLoading) {
    return (
       <>
        <Header />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-full w-full rounded-t-3xl" />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="p-4 space-y-4">
        <BalanceCard />
      </div>
      {userProfile?.accountType === 'network-owner' ? <OwnerDashboard /> : <UserDashboard />}
    </>
  );
}
