'use client';

import { Home, Users, ListChecks, User, Wifi, Repeat } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';


const allNavItems = [
  { name: 'الرئيسية', icon: Home, href: '/', roles: ['admin', 'user'] },
  { name: 'الشبكات', icon: Wifi, href: '/networks-management', roles: ['admin'] },
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
    if (href === '/') return pathname === '/';
    if (href === '/renewal-requests') return pathname.startsWith('/renewal-requests') || pathname.startsWith('/transfer-requests');
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
  
  const transferRequestsQuery = useMemoFirebase(
    () =>
      firestore && isUserAdmin
        ? query(
            collection(firestore, 'transferRequests'),
            where('status', '==', 'pending')
          )
        : null,
    [firestore, isUserAdmin]
  );

  const { data: renewalRequests } = useCollection<RenewalRequest>(renewalRequestsQuery);
  const { data: transferRequests } = useCollection<RenewalRequest>(transferRequestsQuery);
  
  const totalPending = (renewalRequests?.length || 0) + (transferRequests?.length || 0);
  
  useEffect(() => {
    const userRole = isUserAdmin ? 'admin' : 'user';
    setNavItems(allNavItems.filter(item => item.roles.includes(userRole)));
  }, [isUserAdmin]);

  if (isUserLoading) {
    const itemsToShow = isUserAdmin ? allNavItems : allNavItems.filter(i => i.roles.includes('user'));
    return (
       <>
        {itemsToShow.map(item => (
            <div key={item.name} className="flex flex-col items-center justify-center space-y-1 p-2 rounded-md w-1/5">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-md" />
            </div>
        ))}
       </>
    )
  }

  return (
     <>
      {navItems.map(item => {
        const isActive = getActiveState(item.href);
        const showIndicator = item.href === '/renewal-requests' && totalPending > 0;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`relative flex flex-col items-center justify-center space-y-1 p-2 rounded-md transition-all duration-200 w-1/5 focus:outline-none active:scale-95 ${
              isActive
                ? 'text-primary dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-primary dark:hover:text-primary-foreground'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <div className="absolute top-0 h-1 w-8 rounded-full bg-primary" />
            )}

            <div className="relative">
              <item.icon className="h-6 w-6" />
              {showIndicator && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[10px]">
                  {totalPending}
                </span>
              )}
            </div>
            
            <span className="text-xs font-medium">{item.name}</span>
          </Link>
        );
      })}
    </>
  )
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-10 w-full max-w-md border-t bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 items-center justify-around px-2">
        <NavItems />
      </div>
    </nav>
  );
}
