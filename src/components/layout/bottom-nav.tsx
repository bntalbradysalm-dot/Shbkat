"use client";

import { Home, Users, AreaChart, CircleUser } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'الرئيسية', icon: Home, href: '/' },
  { name: 'المستخدمين', icon: Users, href: '/users' },
  { name: 'التقارير', icon: AreaChart, href: '/reports' },
  { name: 'حسابي', icon: CircleUser, href: '/account' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-10 w-full max-w-md border-t bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 items-center justify-around px-2">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href} 
              className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-md ${isActive ? 'text-primary' : 'text-muted-foreground'} transition-colors hover:text-primary w-1/4 focus:bg-accent/50 focus:outline-none`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  );
}
