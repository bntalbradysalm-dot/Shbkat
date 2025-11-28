'use client';

import { SimpleHeader } from '@/components/layout/simple-header';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BellRing, BellOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

type Notification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
};

export default function NotificationsPage() {
  const firestore = useFirestore();

  const notificationsQuery = useMemoFirebase(
    () => firestore
        ? query(
            collection(firestore, 'notifications'),
            orderBy('timestamp', 'desc')
          )
        : null,
    [firestore]
  );

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
             <div key={i} className="p-4 rounded-lg border bg-card flex items-start gap-4">
                <Skeleton className="h-6 w-6 rounded-full mt-1" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                   <Skeleton className="h-3 w-1/2 mt-2" />
                </div>
              </div>
          ))}
        </div>
      );
    }

    if (!notifications || notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center h-64">
          <BellOff className="h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">لا توجد إشعارات</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            لا توجد أي إشعارات جديدة لعرضها حاليًا.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {notifications.map((notification, index) => (
          <div 
            key={notification.id} 
            className="p-4 rounded-lg border bg-card flex items-start gap-4 animate-in fade-in-0"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <BellRing className="h-5 w-5 text-primary dark:text-primary-foreground mt-1 shrink-0" />
            <div className="flex-1">
                <p className="font-bold text-sm">{notification.title}</p>
                <p className="text-sm text-foreground/80 mt-1">{notification.body}</p>
                <p className="text-xs text-muted-foreground mt-2">
                    {format(parseISO(notification.timestamp), 'd MMMM yyyy, h:mm a', { locale: ar })}
                </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="الإشعارات" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
