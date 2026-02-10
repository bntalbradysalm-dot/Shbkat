'use client';

import { BalanceCard } from '@/components/dashboard/balance-card';
import { ServiceGrid } from '@/components/dashboard/service-grid';
import { Header } from '@/components/layout/header';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Wifi, Banknote } from 'lucide-react';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

type UserProfile = {
  accountType?: 'user' | 'network-owner';
};

const OwnerDashboard = () => (
  <div className="relative bg-background rounded-t-[40px] pt-4 pb-4">
      <div className="px-6 animate-in fade-in-0 duration-500">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-primary">لوحة تحكم المالك</h3>
          </div>
      </div>
      <div className="grid grid-cols-2 gap-4 px-6 py-2">
          <Link href="/my-network/manage" className="block">
              <Card className="p-6 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors text-center rounded-3xl border-border/50 shadow-sm">
                  <Wifi className="w-10 h-10" style={{ stroke: 'url(#icon-gradient)' }} />
                  <p className="font-bold text-primary text-sm">إدارة شبكتي</p>
              </Card>
          </Link>
          <Link href="/my-network/withdraw" className="block">
              <Card className="p-6 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 transition-colors text-center rounded-3xl border-border/50 shadow-sm">
                  <Banknote className="w-10 h-10" style={{ stroke: 'url(#icon-gradient)' }} />
                  <p className="font-bold text-primary text-sm">سحب الأرباح</p>
              </Card>
          </Link>
      </div>
       <div className="mt-4">
        <ServiceGrid />
        <RecentTransactions />
      </div>
  </div>
);

const UserDashboard = () => (
  <>
    <ServiceGrid />
    <RecentTransactions />
  </>
);

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isLoading || isUserLoading) {
    return (
       <div className="flex flex-col h-screen bg-background">
        <Header />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-[40px]" />
          <div className="grid grid-cols-3 gap-4 pt-8">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <Header />
      <div className="flex-1 space-y-4">
        <BalanceCard />
        {userProfile?.accountType === 'network-owner' ? <OwnerDashboard /> : <UserDashboard />}
      </div>
    </div>
  );
}
