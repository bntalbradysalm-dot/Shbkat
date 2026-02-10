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
                "relative flex flex-col items-center justify-center transition-all duration-500 ease-in-out px-4 py-2 flex-1 group",
                isActive ? "text-primary" : "text-muted-foreground/60 hover:text-primary/70"
            )}
          >
            {/* Active Highlight Bubble */}
            {isActive && (
                <div className="absolute inset-x-2 inset-y-1 bg-primary/10 rounded-[24px] animate-in fade-in zoom-in duration-300" />
            )}

            <div className="relative z-10">
              <item.icon className={cn("h-6 w-6 transition-all duration-500", isActive ? "scale-110 stroke-[2.5px]" : "group-hover:scale-110")} />
              {showIndicator && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 min-w-[20px] min-h-[20px] items-center justify-center rounded-full bg-destructive text-white text-[10px] font-black border-2 border-background shadow-lg">
                  {totalPending > 9 ? '+9' : totalPending}
                </span>
              )}
            </div>
            
            <span className={cn(
                "text-[10px] font-black mt-1.5 transition-all duration-500 z-10",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
            )}>
                {item.name}
            </span>

            {/* Active Dot */}
            {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full animate-in slide-in-from-bottom-1" />
            )}
          </Link>
        );
      })}
    </>
  )
}

export function BottomNav() {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-[380px] px-4 pointer-events-none">
        <nav className="pointer-events-auto flex h-20 items-center justify-around px-2 bg-card/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
            <NavItems />
        </nav>
    </div>
  );
}
