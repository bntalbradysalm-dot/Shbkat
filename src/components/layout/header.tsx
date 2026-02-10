'use client';
import { Bell, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Notification = {
  id: string;
  timestamp: string;
};

type UserProfile = {
  lastNotificationRead?: string;
  displayName?: string;
  photoURL?: string;
};

const Header = () => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [greeting, setGreeting] = useState('أهلاً');

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting('صباح الخير');
    else setGreeting('مساء الخير');
  }, []);

  const globalNotificationsQuery = useMemoFirebase(
    () => (firestore) ? query(collection(firestore, 'notifications'), orderBy('timestamp', 'desc'), limit(20)) : null,
    [firestore]
  );
  const { data: globalNotifications } = useCollection<Notification>(globalNotificationsQuery);

  const personalNotificationsQuery = useMemoFirebase(
    () => (firestore && user) ? query(collection(firestore, 'users', user.uid, 'notifications'), orderBy('timestamp', 'desc'), limit(20)) : null,
    [firestore, user]
  );
  const { data: personalNotifications } = useCollection<Notification>(personalNotificationsQuery);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (userProfile) {
      const lastReadTime = userProfile.lastNotificationRead 
        ? new Date(userProfile.lastNotificationRead).getTime() 
        : 0;
      
      const allNotifs = [
        ...(globalNotifications || []),
        ...(personalNotifications || [])
      ];

      const count = allNotifs.filter(n => new Date(n.timestamp).getTime() > lastReadTime).length;
      setUnreadCount(count);
    }
  }, [globalNotifications, personalNotifications, userProfile]);

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userDocRef) {
      const allNotifs = [
        ...(globalNotifications || []),
        ...(personalNotifications || [])
      ];
      
      if (allNotifs.length > 0) {
        const latestTs = allNotifs.reduce((latest, current) => {
          return new Date(current.timestamp).getTime() > new Date(latest).getTime() 
            ? current.timestamp 
            : latest;
        }, allNotifs[0].timestamp);
        
        updateDoc(userDocRef, { lastNotificationRead: latestTs });
      } else {
        updateDoc(userDocRef, { lastNotificationRead: new Date().toISOString() });
      }
    }
    router.push('/notifications');
  };

  const getFirstAndLastName = (name?: string) => {
    if (!name) return 'مستخدم شبكات';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const displayName = getFirstAndLastName(user?.displayName || userProfile?.displayName);

  return (
    <header className="flex items-center justify-between p-4 bg-transparent text-foreground relative h-24">
      <div className="flex items-center gap-3 flex-1 px-2">
        <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/50 shadow-sm shrink-0">
          <Image 
            src="https://i.postimg.cc/VvxBNG2N/Untitled-1.jpg" 
            alt="Logo" 
            fill 
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-start justify-center">
          {isUserLoading ? (
            <div className="space-y-2 text-right">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
          ) : (
            <>
              <p className="text-primary font-bold text-xs opacity-80 leading-tight">{greeting}</p>
              <h1 className="font-black text-foreground text-base tracking-tight leading-tight">{displayName}</h1>
            </>
          )}
        </div>
      </div>

      <button 
        onClick={handleNotificationClick} 
        className="relative p-2.5 bg-muted/20 rounded-full border border-border/50"
      >
        <Bell className="h-6 w-6 text-primary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold animate-in zoom-in">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
};

export { Header };