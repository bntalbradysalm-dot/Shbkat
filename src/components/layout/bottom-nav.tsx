'use client';

import { Home, Users, User, Repeat } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const allNavItems = [
  { name: 'الرئيسية', icon: Home, href: '/login', roles: ['admin', 'user'] },
  { name: 'الطلبات', icon: Repeat, href: '/renewal-requests', roles: ['admin'] },
  { name: 'المستخدمين', icon: Users, href: '/users', roles: ['admin'] },
  { name: 'حسابي', icon: User, href: '/account', roles: ['admin', 'user'] },
];

type RenewalRequest = {
  status: 'pending' | 'approved' | 'rejected';
}

function NavItems() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const isUserAdmin = user?.email === '770326828@shabakat.com';

  const [navItems, setNavItems] = useState(allNavItems.filter(item => item.roles.includes('user')));
  
  const getActiveState = (href: string) => {
    if (href === '/login') return pathname === '/login';
    if (href === '/renewal-requests') return pathname.startsWith('/renewal-requests') || pathname.startsWith('/withdrawal-requests') || pathname.startsWith('/bill-payment-requests') || pathname.startsWith('/store-orders');
    return pathname.startsWith(href);
  };

  const renewalRequestsQuery = useMemoFirebase(
    () =>
      firestore && isUserAdmin
        ? query(
            collection(firestore, 'renewalRequests'),
            where('status', '==', 'pending')
          )
        : null,
    [firestore, isUserAdmin]
  );
  
  const withdrawalRequestsQuery = useMemoFirebase(
    () =>
      firestore && isUserAdmin
        ? query(
            collection(firestore, 'withdrawalRequests'),
            where('status', '==', 'pending')
          )
        : null,
    [firestore, isUserAdmin]
  );

  const { data: renewalRequests } = useCollection<RenewalRequest>(renewalRequestsQuery);
  const { data: withdrawalRequests } = useCollection<RenewalRequest>(withdrawalRequestsQuery);
  
  const totalPending = (renewalRequests?.length || 0) + (withdrawalRequests?.length || 0);
  
  useEffect(() => {
    const userRole = isUserAdmin ? 'admin' : 'user';
    setNavItems(allNavItems.filter(item => item.roles.includes(userRole)));
  }, [isUserAdmin]);

  if (isUserLoading) {
    const itemsToShow = isUserAdmin ? allNavItems : allNavItems.filter(i => i.roles.includes('user'));
    return (
       <>
        {itemsToShow.map(item => (
            <div key={item.name} className="flex flex-col items-center justify-center space-y-1 p-2 w-1/4">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-2 w-10 rounded-md" />
            </div>
        ))}
       </>
    )
  }

  return (
     <>
      {navItems.map(item => {
        const isActive = getActiveState(item.href);
        const isRequests = item.href === '/renewal-requests';
        const showIndicator = isRequests && totalPending > 0;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
                "relative flex flex-col items-center justify-center transition-all duration-300 flex-1 group py-1",
                isActive ? "text-primary" : "text-muted-foreground/60 hover:text-primary/70"
            )}
          >
            <div className="relative py-1">
              <item.icon className={cn("h-6 w-6 transition-transform duration-300", isActive ? "scale-110 stroke-[2.5px]" : "group-hover:scale-110")} />
              {showIndicator && (
                <span className="absolute -top-1 -right-2 flex h-4 w-4 min-w-[18px] min-h-[18px] items-center justify-center rounded-full bg-destructive text-white text-[9px] font-black border-2 border-background shadow-sm">
                  {totalPending > 9 ? '+9' : totalPending}
                </span>
              )}
            </div>
            
            <span className={cn(
                "text-[10px] font-bold transition-all duration-300",
                isActive ? "opacity-100 scale-105" : "opacity-70"
            )}>
                {item.name}
            </span>

            {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-in zoom-in" />
            )}
          </Link>
        );
      })}
    </>
  )
}

export function BottomNav() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[360px] px-4">
        <nav className="flex h-16 items-center justify-around bg-card/90 dark:bg-slate-950/90 backdrop-blur-xl border border-border/50 shadow-2xl rounded-full px-2">
            <NavItems />
        </nav>
    </div>
  );
}
