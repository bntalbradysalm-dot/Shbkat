'use client';

import { SimpleHeader } from '@/components/layout/simple-header';
import { useFirestore, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, writeBatch, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { BellRing, BellOff, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

type Notification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
};

export default function NotificationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [monthToDelete, setMonthToDelete] = useState<string | null>(null);

  const notificationsQuery = useMemoFirebase(
    () => user && firestore
        ? query(
            collection(firestore, 'users', user.uid, 'notifications'),
            orderBy('timestamp', 'desc')
          )
        : null,
    [firestore, user]
  );

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const groupedNotifications = React.useMemo(() => {
    if (!notifications) return {};
    
    return notifications.reduce((acc, notification) => {
      const monthKey = format(parseISO(notification.timestamp), 'yyyy-MM');
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(notification);
      return acc;
    }, {} as Record<string, Notification[]>);
  }, [notifications]);

  const sortedMonths = React.useMemo(() => {
    return Object.keys(groupedNotifications).sort().reverse();
  }, [groupedNotifications]);

  const handleDeleteMonth = () => {
    if (!monthToDelete || !user || !firestore) return;

    const notificationsToDelete = groupedNotifications[monthToDelete];
    if (!notificationsToDelete || notificationsToDelete.length === 0) return;

    const batch = writeBatch(firestore);
    notificationsToDelete.forEach(notification => {
        const docRef = doc(firestore, 'users', user.uid, 'notifications', notification.id);
        batch.delete(docRef);
    });

    batch.commit().then(() => {
        toast({
            title: "تم الحذف",
            description: `تم حذف جميع إشعارات شهر ${format(parseISO(`${monthToDelete}-01`), 'MMMM yyyy', { locale: ar })} بنجاح.`
        });
    }).catch(error => {
        console.error("Error deleting notifications:", error);
        toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'فشل حذف الإشعارات.'
        });
    }).finally(() => {
        setMonthToDelete(null);
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
             <div key={i} className="p-4 rounded-lg border bg-card flex items-start gap-4">
                <Skeleton className="h-6 w-full" />
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
      <Accordion type="single" collapsible className="w-full space-y-3" defaultValue={sortedMonths[0]}>
        {sortedMonths.map(monthKey => (
            <AccordionItem value={monthKey} key={monthKey} className="border bg-card rounded-lg overflow-hidden">
                 <div className="flex items-center justify-between pr-4">
                    <AccordionTrigger className="py-4 pl-4 text-base font-bold hover:no-underline flex-1">
                        {format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: ar })}
                    </AccordionTrigger>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            setMonthToDelete(monthKey);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                <AccordionContent className="border-t px-4">
                    <div className="space-y-4 pt-4">
                        {groupedNotifications[monthKey].map((notification) => (
                        <div 
                            key={notification.id} 
                            className="flex items-start gap-4"
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
                </AccordionContent>
            </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="الإشعارات" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
    <Toaster />
    <AlertDialog open={!!monthToDelete} onOpenChange={(open) => !open && setMonthToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription>
                    هل أنت متأكد من رغبتك في حذف جميع إشعارات شهر {monthToDelete && format(parseISO(`${monthToDelete}-01`), 'MMMM yyyy', { locale: ar })}؟
                    لا يمكن التراجع عن هذا الإجراء.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMonth} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
