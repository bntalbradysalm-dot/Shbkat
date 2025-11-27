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
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full mt-1" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </CardContent>
            </Card>
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
      <div className="space-y-4">
        {notifications.map((notification, index) => (
          <Card 
            key={notification.id} 
            className="animate-in fade-in-0"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
               <CardTitle className="text-base font-bold flex items-center gap-2">
                 <BellRing className="h-5 w-5 text-primary" />
                 {notification.title}
               </CardTitle>
               <p className="text-xs text-muted-foreground">
                {format(parseISO(notification.timestamp), 'd MMMM yyyy', { locale: ar })}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">{notification.body}</p>
            </CardContent>
          </Card>
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
