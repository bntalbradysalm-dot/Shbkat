'use client';

import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React from 'react';
import Link from 'next/link';

export function Header() {
  const [greeting, setGreeting] = React.useState('');
  const [userName, setUserName] = React.useState('اسم المستخدم'); // Placeholder name

  React.useEffect(() => {
    const updateGreeting = () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 5 = Friday
      const hour = now.getHours();

      if (day === 5) {
        setGreeting('جمعة مباركة');
      } else if (hour >= 18 || hour < 4) {
        setGreeting('مساءك جميل');
      } else {
        setGreeting('صباحك جميل');
      }
    };

    updateGreeting();
  }, []);

  return (
    <header className="flex items-center justify-between p-4 sticky top-0 bg-primary text-primary-foreground z-10 shadow-md">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        className="h-9 w-9 rounded-full hover:bg-white/20 text-primary-foreground"
      >
        <Bell className="h-5 w-5 text-primary-foreground" />
      </Button>
      <div className="flex flex-col items-center text-primary-foreground">
        <h1 className="text-lg font-bold font-headline">{greeting}</h1>
        <p className="text-sm opacity-90">{userName}</p>
      </div>
      <Link href="/account">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account"
          className="h-10 w-10 hover:bg-white/20 text-primary-foreground"
        >
          <User className="h-7 w-7 text-primary-foreground" />
        </Button>
      </Link>
    </header>
  );
}
