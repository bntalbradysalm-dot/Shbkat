'use client';
import { Bell, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

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
    if (hour < 12) setGreeting('صباح الخير 👋');
    else setGreeting('مساء الخير 👋');
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

  const getFirstAndLastName = (name?: string) => {
    if (!name) return 'مستخدم شبكات';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const displayName = getFirstAndLastName(user?.displayName || userProfile?.displayName);

  return (
    <header className="flex items-center justify-between p-4 bg-transparent text-foreground relative h-24">
      <div className="flex flex-col items-start justify-center flex-1 px-2">
        {isUserLoading ? (
          <div className="space-y-2 text-right">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-32" />
          </div>
        ) : (
          <>
            <p className="text-primary font-normal text-sm opacity-80">{greeting}</p>
            <h1 className="font-black text-foreground text-lg mt-0.5 tracking-tight">{displayName}</h1>
          </>
        )}
      </div>

      <button 
        onClick={handleNotificationClick} 
        className="relative p-2.5 bg-muted/20 rounded-full border border-border/50"
      >
        <Bell className="h-6 w-6 text-primary" />
        {hasUnread && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        )}
      </button>
    </header>
  );
};

export { Header };
