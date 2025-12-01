'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc, query, orderBy, writeBatch, increment } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Check, X, Archive, Inbox, Banknote, Trash2 } from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

type ManualDepositRequest = {
  id: string;
  userId: string;
  userName: string;
  userPhoneNumber: string;
  amount: number;
  receiptImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string;
  notes?: string;
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
            <Link key={request.id} href={`/manual-deposits/${request.id}`} className="block">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                          <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                          <p className="font-bold">{request.userName}</p>
                          <p className="text-sm text-muted-foreground">{request.userPhoneNumber}</p>
                      </div>
                    </div>
                    <div className="text-left flex flex-col items-end gap-1">
                        <p className="font-bold text-lg text-primary">{request.amount.toLocaleString('en-US')} ريال</p>
                        <StatusBadge status={request.status} />
                    </div>
                </CardContent>
              </Card>
            </Link>
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
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="طلبات الإيداع اليدوي" />
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
      <Toaster />
    </>
  );
}
