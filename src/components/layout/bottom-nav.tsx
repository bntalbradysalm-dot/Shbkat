
'use client';

import { Home, Users, User, Repeat, Heart, Smartphone, History } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// تعريف العناصر حسب الدور
const userNavItems = [
  { id: 'home', name: 'الرئيسية', icon: Home, href: '/login', position: 'side' },
  { id: 'pay', name: 'سداد', icon: Smartphone, href: '/telecom-services', position: 'side' },
  { id: 'fav', name: 'المفضلة', icon: Heart, href: '/favorites', position: 'center' },
  { id: 'tx', name: 'العمليات', icon: History, href: '/transactions', position: 'side' },
  { id: 'acc', name: 'حسابي', icon: User, href: '/account', position: 'side' },
];

const adminNavItems = [
  { id: 'home', name: 'الرئيسية', icon: Home, href: '/login', position: 'side' },
  { id: 'req', name: 'الطلبات', icon: Repeat, href: '/renewal-requests', position: 'side' },
  { id: 'fav', name: 'المفضلة', icon: Heart, href: '/favorites', position: 'center' },
  { id: 'users', name: 'المستخدمين', icon: Users, href: '/users', position: 'side' },
  { id: 'acc', name: 'حسابي', icon: User, href: '/account', position: 'side' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const isUserAdmin = user?.email === '770326828@shabakat.com' || user?.uid === 'wsy8bUcULSYX2J9Q9WyisiFX5ki2';
  const navItems = isUserAdmin ? adminNavItems : userNavItems;

  const getActiveState = (href: string) => {
    if (href === '/login') return pathname === '/login';
    if (href === '/renewal-requests') return pathname.startsWith('/renewal-requests') || pathname.startsWith('/withdrawal-requests') || pathname.startsWith('/bill-payment-requests') || pathname.startsWith('/store-orders');
    return pathname.startsWith(href);
  };

  // جلب عدد الطلبات المعلقة للمدير فقط
  const renewalRequestsQuery = useMemoFirebase(
    () => firestore && isUserAdmin ? query(collection(firestore, 'renewalRequests'), where('status', '==', 'pending')) : null,
    [firestore, isUserAdmin]
  );
  const withdrawalRequestsQuery = useMemoFirebase(
    () => firestore && isUserAdmin ? query(collection(firestore, 'withdrawalRequests'), where('status', '==', 'pending')) : null,
    [firestore, isUserAdmin]
  );
  const { data: renewalRequests } = useCollection<any>(renewalRequestsQuery);
  const { data: withdrawalRequests } = useCollection<any>(withdrawalRequestsQuery);
  const totalPending = (renewalRequests?.length || 0) + (withdrawalRequests?.length || 0);

  if (isUserLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 px-4 pointer-events-none">
        <div className="w-full max-w-[400px] h-20 bg-card/80 backdrop-blur-xl rounded-[32px] border shadow-2xl flex items-center justify-around px-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-10 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const sideItemsStart = navItems.slice(0, 2);
  const centerItem = navItems[2];
  const sideItemsEnd = navItems.slice(3, 5);

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = getActiveState(item.href);
    const isRequests = item.id === 'req';
    const showBadge = isRequests && totalPending > 0;

    return (
      <Link
        href={item.href}
        className={cn(
          "flex flex-col items-center justify-center transition-all duration-300 relative group flex-1",
          isActive ? "text-primary" : "text-muted-foreground/50 hover:text-primary/70"
        )}
      >
        <div className="relative">
          <item.icon className={cn("h-5 w-5 transition-transform duration-300", isActive ? "scale-110 stroke-[2.5px]" : "group-hover:scale-110")} />
          {showBadge && (
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[8px] font-black border-2 border-background shadow-sm">
              {totalPending > 9 ? '+9' : totalPending}
            </span>
          )}
        </div>
        <span className={cn(
          "text-[9px] font-black mt-1 transition-all duration-300",
          isActive ? "opacity-100" : "opacity-70"
        )}>
          {item.name}
        </span>
        {isActive && (
          <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full animate-in zoom-in" />
        )}
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="w-full max-w-[450px] relative pointer-events-auto select-none">
        
        {/* خلفية الشريط المتموجة باستخدام SVG */}
        <div className="absolute bottom-0 left-0 right-0 h-[85px] drop-shadow-[0_-10px_25px_rgba(0,0,0,0.08)]">
          <svg viewBox="0 0 400 85" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full preserve-3d">
            <path 
              d="M0 35C0 15.67 15.67 0 35 0H145.5C155.5 0 164.5 5.5 169 14.5C175.5 27.5 187 35 200 35C213 35 224.5 27.5 231 14.5C235.5 5.5 244.5 0 254.5 0H365C384.33 0 400 15.67 400 35V85H0V35Z" 
              className="fill-card dark:fill-slate-950 transition-colors duration-500"
            />
          </svg>
        </div>

        {/* العناصر داخل الشريط */}
        <div className="relative h-[85px] flex items-end pb-4 px-2">
          
          {/* الجانب الأيمن */}
          <div className="flex-1 flex justify-around items-center h-14 pr-2">
            {sideItemsStart.map(item => <NavItem key={item.id} item={item} />)}
          </div>

          {/* العنصر الأوسط الدائري */}
          <div className="relative w-20 flex justify-center h-20 -translate-y-4">
            <Link href={centerItem.href} className="group relative">
                <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 active:scale-90 relative overflow-hidden",
                    "bg-mesh-gradient"
                )}>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <centerItem.icon className={cn(
                        "h-7 w-7 text-white transition-transform duration-500",
                        pathname.startsWith(centerItem.href) ? "scale-110 fill-white" : "group-hover:scale-110"
                    )} />
                </div>
                {/* ظل سفلي للزر */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-primary/20 blur-md rounded-full" />
            </Link>
          </div>

          {/* الجانب الأيسر */}
          <div className="flex-1 flex justify-around items-center h-14 pl-2">
            {sideItemsEnd.map(item => <NavItem key={item.id} item={item} />)}
          </div>

        </div>
      </div>
    </div>
  );
}
