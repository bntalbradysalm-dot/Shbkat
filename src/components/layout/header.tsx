import { Bell } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';

export function Header() {
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');
  return (
    <header className="flex items-center justify-between p-4 sticky top-0 bg-card/80 backdrop-blur-sm z-10 border-b">
      <Avatar className="h-9 w-9">
        {userAvatar && <AvatarImage src={userAvatar.imageUrl} alt={userAvatar.description} data-ai-hint={userAvatar.imageHint} />}
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <h1 className="text-xl font-bold text-primary font-headline">محفظة شبكات</h1>
      <Button variant="ghost" size="icon" aria-label="Notifications" className="h-9 w-9 rounded-full">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </Button>
    </header>
  );
}
