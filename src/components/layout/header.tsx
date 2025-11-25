'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { useState, useEffect } from 'react';

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

  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  return (
    <header className="flex items-center justify-between p-4 bg-transparent">
      <div className="flex items-center gap-3">
        {userAvatar && (
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
            <Image
              src={userAvatar.imageUrl}
              alt={userAvatar.description}
              data-ai-hint={userAvatar.imageHint}
              width={48}
              height={48}
              className="object-cover"
            />
          </Avatar>
        )}
        <div>
          <p className="text-sm text-foreground/80">{greeting}</p>
          <h1 className="font-bold text-lg text-foreground">اسم المستخدم</h1>
        </div>
      </div>
      <div className="relative">
        <Bell className="h-6 w-6 text-foreground" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
      </div>
    </header>
  );
};

export { Header };
