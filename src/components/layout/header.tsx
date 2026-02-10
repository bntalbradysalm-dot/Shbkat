'use client';
import { Bell, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
  const [hasUnread, setHasUnread] = useState(false);
  const [greeting, setGreeting] = useState('أهلاً');

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting('صباحك جميل 👋');
    else setGreeting('مساءك جميل 👋');
  }, []);

  const lastNotificationQuery = useMemoFirebase(
    () => (firestore && user) ? query(collection(firestore, 'notifications'), orderBy('timestamp', 'desc'), limit(1)) : null,
    [firestore, user]
  );
  const { data: lastNotification } = useCollection<Notification>(lastNotificationQuery);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (lastNotification && lastNotification.length > 0 && userProfile) {
      const latestTimestamp = lastNotification[0].timestamp;
      const lastReadTimestamp = userProfile.lastNotificationRead;
      setHasUnread(!lastReadTimestamp || new Date(latestTimestamp) > new Date(lastReadTimestamp));
    }
  }, [lastNotification, userProfile]);

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userDocRef && lastNotification && lastNotification.length > 0) {
      setHasUnread(false);
      updateDoc(userDocRef, { lastNotificationRead: lastNotification[0].timestamp });
    }
    router.push('/notifications');
  };

  return (
    <header className="flex items-center justify-between p-4 bg-transparent text-foreground relative h-20">
      <button onClick={handleNotificationClick} className="relative p-2.5 bg-muted/20 rounded-full border border-border/50">
        <Bell className="h-6 w-6 text-primary" />
        {hasUnread && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        )}
      </button>

      <div className="flex flex-col items-center justify-center flex-1 text-center">
        {isUserLoading ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <>
            <p className="text-primary font-bold text-lg">{greeting}</p>
            <h1 className="font-bold text-foreground opacity-70 text-sm mt-0.5">{user?.displayName || 'محمد باشادي'}</h1>
          </>
        )}
      </div>

      <Avatar className="h-14 w-14 border-2 border-border/50 bg-muted">
        <AvatarFallback>
          <UserIcon className="h-8 w-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
    </header>
  );
};

export { Header };
