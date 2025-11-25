'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  LayoutGrid,
  Moon,
  Phone,
  Sun,
  User,
  MapPin,
  Users,
  Wifi,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

const managementLinks = [
  { title: 'إدارة المستخدمين', icon: Users, href: '/users-management' },
  { title: 'إدارة الشبكات', icon: Wifi, href: '/networks-management' },
  { title: 'إدارة الكروت', icon: CreditCard, href: '/cards-management' },
];

export default function AccountPage() {
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('hsl(173, 80%, 42%)');

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  React.useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor);
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, [primaryColor]);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 sticky top-0 bg-primary text-primary-foreground z-10 shadow-md">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" aria-label="العودة" className="hover:bg-white/20 text-primary-foreground">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">حسابي</h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="overflow-hidden bg-primary text-primary-foreground shadow-lg">
          <CardContent className="p-4 flex items-center gap-4">
            <User className="h-10 w-10 shrink-0" />
            <div className="flex-grow">
              <h2 className="text-lg font-bold">محمد راضي ربيع باشادي</h2>
              <div className="text-sm opacity-90 mt-2 space-y-1">
                <div className="flex items-center">
                  <Phone className="ml-2 h-4 w-4" />
                  <span>770326828</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="ml-2 h-4 w-4" />
                  <span>حضرموت - شبام</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-center text-muted-foreground mb-3">
              الوضع المفضل
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={theme === 'dark' ? 'outline' : 'ghost'}
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col h-20 gap-2 border-2 ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10'
                    : 'bg-muted/50 border-transparent'
                }`}
              >
                <Moon />
                <span>داكن</span>
              </Button>
              <Button
                variant={theme === 'light' ? 'outline' : 'ghost'}
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col h-20 gap-2 border-2 ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10'
                    : 'bg-muted/50 border-transparent'
                }`}
              >
                <Sun />
                <span>فاتح</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              لوحة التحكم
            </h3>
          </div>

          <Card>
            <CardContent className="p-0">
              {managementLinks.map((link, index) => (
                <a
                  href={link.href}
                  key={link.title}
                  className={`group flex items-center justify-between p-4 cursor-pointer ${
                    index < managementLinks.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-semibold">{link.title}</span>
                  </div>
                  <ChevronLeft className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
