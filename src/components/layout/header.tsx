"use client";

import { Bell } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import React from 'react';

export function Header() {
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');
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
    // You can also set an interval to update the greeting periodically if needed
    // const intervalId = setInterval(updateGreeting, 60000);
    // return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="flex items-center justify-between p-4 sticky top-0 bg-card/80 backdrop-blur-sm z-10 border-b">
      <Button variant="ghost" size="icon" aria-label="Notifications" className="h-9 w-9 rounded-full">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </Button>
      <div className="flex flex-col items-center">
        <h1 className="text-lg font-bold text-primary font-headline">{greeting}</h1>
        <p className="text-sm text-muted-foreground">{userName}</p>
      </div>
      <Avatar className="h-9 w-9">
        {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={userAvatar.description} data-ai-hint={userAvatar.imageHint} />}
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </header>
  );
}
