'use client';
import { Bell, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card } from '../ui/card';

const Header = () => {
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
        <Card className="h-12 w-12 flex items-center justify-center bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </Card>
        <div>
          <p className="text-sm text-foreground/80">{greeting}</p>
          <h1 className="font-bold text-lg">اسم المستخدم</h1>
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
