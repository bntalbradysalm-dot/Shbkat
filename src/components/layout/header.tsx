'use client';
import { Bell, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';


const Header = () => {
  const { user, isUserLoading } = useUser();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 12) {
      setGreeting('صباحك جميل');
    } else {
      setGreeting('مساءك جميل');
    }
  }, []);

  return (
    <header className="flex items-center justify-between p-4 bg-transparent text-foreground">
      <div className="flex items-center gap-3">
        <UserIcon className="h-10 w-10 text-primary" />
        <div>
          <p className="text-sm text-foreground/80">{greeting}</p>
          {isUserLoading ? (
            <Skeleton className="h-6 w-32 mt-1" />
          ) : (
             <h1 className="font-bold text-lg">{user?.displayName || user?.email || 'مستخدم جديد'}</h1>
          )}
        </div>
      </div>
      <div className="relative">
        <Bell className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
      </div>
    </header>
  );
};

export { Header };
