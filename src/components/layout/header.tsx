'use client';
import { Bell, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


type Notification = {
  id: string;
  timestamp: string;
};

type UserProfile = {
  lastNotificationRead?: string;
};

const getShortName = (fullName: string | null | undefined): string => {
  if (!fullName) return 'مستخدم جديد';
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length > 1) {
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
  }
  return fullName;
};


const Header = () => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [hasUnread, setHasUnread] = useState(false);

  // Get the last notification
  const lastNotificationQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'notifications'), orderBy('timestamp', 'desc'), limit(1)) : null,
    [firestore]
  );
  const { data: lastNotification } = useCollection<Notification>(lastNotificationQuery);

  // Get user profile
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 12) {
      setGreeting('صباحك جميل');
    } else {
      setGreeting('مساءك جميل');
    }
  }, []);

  useEffect(() => {
    if (lastNotification && lastNotification.length > 0 && userProfile) {
      const latestTimestamp = lastNotification[0].timestamp;
      const lastReadTimestamp = userProfile.lastNotificationRead;
      if (!lastReadTimestamp || new Date(latestTimestamp) > new Date(lastReadTimestamp)) {
        setHasUnread(true);
      } else {
        setHasUnread(false);
      }
    } else {
      setHasUnread(false);
    }
  }, [lastNotification, userProfile]);

  const handleNotificationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userDocRef && lastNotification && lastNotification.length > 0) {
      // Optimistically update UI
      setHasUnread(false);
      // Update last read timestamp in Firestore
      updateDoc(userDocRef, {
        lastNotificationRead: lastNotification[0].timestamp,
      }).catch(err => {
        // if update fails, revert UI change
        console.error("Failed to update last read timestamp", err);
        setHasUnread(true);
      });
    }
    router.push('/notifications');
  };


  return (
    <header className="flex items-center justify-between p-4 bg-transparent text-foreground">
      <div className="flex items-center gap-3">
        <UserIcon className="h-10 w-10 text-primary" />
        <div>
          <p className="text-sm text-foreground/80">{greeting}</p>
          {isUserLoading ? (
            <Skeleton className="h-6 w-32 mt-1" />
          ) : (
             <h1 className="font-bold text-lg">{getShortName(user?.displayName)}</h1>
          )}
        </div>
      </div>
      <button onClick={handleNotificationClick} className="relative p-2">
        <Bell className="h-6 w-6" />
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
