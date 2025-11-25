'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const Header = () => {
  const [greeting, setGreeting] = useState('');
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');
  const [avatarUrl, setAvatarUrl] = useState(userAvatar?.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 12) {
      setGreeting('صباحك جميل');
    } else {
      setGreeting('مساءك جميل');
    }
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newAvatarUrl = URL.createObjectURL(file);
      setAvatarUrl(newAvatarUrl);
      // In a real app, you would upload the file to a server here.
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-transparent text-foreground">
      <div className="flex items-center gap-3">
        <div className="cursor-pointer" onClick={handleAvatarClick}>
          {avatarUrl && userAvatar && (
            <Avatar className="h-12 w-12 border-2 border-primary-foreground/50 shadow-sm">
              <Image
                src={avatarUrl}
                alt={userAvatar.description}
                data-ai-hint={userAvatar.imageHint}
                width={48}
                height={48}
                className="object-cover"
              />
            </Avatar>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>
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
