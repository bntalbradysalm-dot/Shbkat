'use client';

import { Home, Users, ListChecks, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';

const allNavItems = [
  { name: 'الرئيسية', icon: Home, href: '/', roles: ['admin', 'user'] },
  { name: 'المستخدمين', icon: Users, href: '/users', roles: ['admin'] },
  { name: 'طلبات التجديد', icon: ListChecks, href: '/renewal-requests', roles: ['admin'] },
  { name: 'حسابي', icon: User, href: '/account', roles: ['admin', 'user'] },
];

type UserProfile = {
  role?: 'admin' | 'user';
};

type RenewalRequest = {
  status: 'pending' | 'approved' | 'rejected';
}

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const userRole = userProfile?.role || 'user';

  const pendingRequestsQuery = useMemoFirebase(
    () =>
      firestore && userRole === 'admin'
        ? query(
            collection(firestore, 'renewalRequests'),
            where('status', '==', 'pending')
          )
        : null,
    [firestore, userRole]
  );

  const { data: pendingRequests } = useCollection<RenewalRequest>(pendingRequestsQuery);

  const hasPendingRequests = pendingRequests && pendingRequests.length > 0;

  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-10 w-full max-w-md border-t bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 items-center justify-around px-2">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          const showIndicator = item.href === '/renewal-requests' && hasPendingRequests;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex flex-col items-center justify-center space-y-1 p-2 rounded-md transition-all duration-200 w-1/4 focus:outline-none active:scale-95 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <div className="absolute top-0 h-1 w-8 rounded-full bg-primary" />
              )}

              <div className="relative">
                <item.icon className="h-6 w-6" />
                {showIndicator && (
                  <span className="absolute top-0 right-0 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                  </span>
                )}
              </div>
              
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
