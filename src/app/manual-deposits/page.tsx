'use client';

import React, { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Archive, Inbox } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

type ManualDepositRequest = {
  id: string;
  userName: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
};

const StatusBadge = ({ status }: { status: ManualDepositRequest['status'] }) => {
  const statusStyles = {
    pending: 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30',
    approved: 'bg-green-400/20 text-green-600 border-green-400/30',
    rejected: 'bg-red-400/20 text-red-600 border-red-400/30',
  };
  const statusText = {
    pending: 'قيد الانتظار',
    approved: 'مقبول',
    rejected: 'مرفوض',
  };

  return <Badge className={statusStyles[status]}>{statusText[status]}</Badge>;
};

export default function ManualDepositsPage() {
  const firestore = useFirestore();
  const router = useRouter();

  const requestsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'manualDepositRequests'), orderBy('requestTimestamp', 'desc')) : null),
    [firestore]
  );
  const { data: requests, isLoading } = useCollection<ManualDepositRequest>(requestsQuery);

  const { pendingRequests, archivedRequests } = useMemo(() => {
    const pending: ManualDepositRequest[] = [];
    const archived: ManualDepositRequest[] = [];
    requests?.forEach(req => {
      if (req.status === 'pending') {
        pending.push(req);
      } else {
        archived.push(req);
      }
    });
    return { pendingRequests: pending, archivedRequests: archived };
  }, [requests]);

  const RequestList = ({ list, emptyMessage }: { list: ManualDepositRequest[], emptyMessage: string }) => {
    if (!list || list.length === 0) {
      return <p className="text-center text-muted-foreground mt-10">{emptyMessage}</p>;
    }
    return (
        <div className="space-y-3">
          {list.map((request) => (
            <div
              key={request.id}
              onClick={() => router.push(`/manual-deposits/${request.id}`)}
              className="cursor-pointer"
            >
              <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                      <p className="font-bold">{request.userName}</p>
                      <p className="text-sm font-semibold text-primary">{request.amount.toLocaleString('en-US')} ريال</p>
                  </div>
                  </div>
                  <div className="text-left flex flex-col items-end gap-1">
                      <StatusBadge status={request.status} />
                      <span className="text-xs text-muted-foreground">
                          {format(parseISO(request.requestTimestamp), 'P', { locale: ar })}
                      </span>
                  </div>
              </CardContent>
              </Card>
            </div>
          ))}
        </div>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      );
    }
    return (
        <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">
                   <Inbox className="ml-2 h-4 w-4"/>
                   الطلبات الحالية ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="archived">
                    <Archive className="ml-2 h-4 w-4"/>
                    الأرشيف ({archivedRequests.length})
                </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="p-4">
               <RequestList list={pendingRequests} emptyMessage="لا توجد طلبات إيداع حاليًا."/>
            </TabsContent>
            <TabsContent value="archived" className="p-4">
                <RequestList list={archivedRequests} emptyMessage="لا توجد طلبات مؤرشفة."/>
            </TabsContent>
        </Tabs>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="طلبات الإيداع اليدوي" />
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
    