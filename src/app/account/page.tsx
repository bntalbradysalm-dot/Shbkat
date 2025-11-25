'use client';

import React, { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  ChevronLeft,
  Paintbrush,
  Palette,
  Phone,
  Sun,
  Moon,
  MapPin,
  User,
} from 'lucide-react';
import Link from 'next/link';

const colors = [
  { name: 'Default', value: 'hsl(174 100% 32.5%)' },
  { name: 'Blue', value: 'hsl(221.2 83.2% 53.3%)' },
  { name: 'Rose', value: 'hsl(346.8 77.2% 49.8%)' },
  { name: 'Green', value: 'hsl(142.1 76.2% 36.3%)' },
  { name: 'Orange', value: 'hsl(24.6 95% 53.1%)' },
];

export default function AccountPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(colors[0].value);

  const handleThemeChange = (dark: boolean) => {
    setIsDarkMode(dark);
    document.documentElement.classList.toggle('dark', dark);
  };
  
  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
    document.documentElement.style.setProperty('--primary', color);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 sticky top-0 bg-card/80 backdrop-blur-sm z-10 border-b">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon" aria-label="العودة">
            <ArrowLeft className="h-6 w-6 text-muted-foreground" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-primary">حسابي</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" alt="صورة المستخدم" />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <CardTitle className="text-xl">اسم المستخدم</CardTitle>
              <CardDescription>مرحباً بك مجدداً!</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Phone className="ml-3 h-4 w-4" />
              <span>+967 777 777 777</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <MapPin className="ml-3 h-4 w-4" />
              <span>صنعاء، اليمن</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paintbrush className="h-5 w-5" />
              المظهر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" /> }
                  <span className="font-medium">الوضع الداكن</span>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={handleThemeChange}
                aria-label="Toggle dark mode"
              />
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 mb-3">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">ألوان التطبيق</span>
              </div>
              <div className="flex items-center justify-around">
                {colors.map((color) => (
                  <Button
                    key={color.name}
                    variant="ghost"
                    size="icon"
                    className={`h-10 w-10 rounded-full border-2 ${primaryColor === color.value ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => handleColorChange(color.value)}
                    aria-label={`Change color to ${color.name}`}
                  >
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{ backgroundColor: color.value }}
                    />
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
