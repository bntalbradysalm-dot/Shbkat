'use client';

import React, { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Phone, Mail } from 'lucide-react';

// Define the User type based on your backend.json schema
type User = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
};

export default function UsersPage() {
  const firestore = useFirestore();

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  
  const { data: users, isLoading, error } = useCollection<User>(usersCollection);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center">جاري تحميل المستخدمين...</p>;
    }
    if (error) {
      console.error(error);
      return <p className="text-center text-destructive">حدث خطأ أثناء جلب المستخدمين.</p>;
    }
    if (!users || users.length === 0) {
      return <p className="text-center">لا يوجد مستخدمين لعرضهم.</p>;
    }
    return (
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Avatar>
                <AvatarImage src={`https://i.pravatar.cc/150?u=${user.id}`} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback>
                  <UserIcon />
                </AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <p className="font-bold">
                  {user.firstName || ''} {user.lastName || 'مستخدم غير معروف'}
                </p>
                {user.email && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center">
                        <Mail className="ml-2 h-3 w-3" />
                        <span>{user.email}</span>
                    </div>
                )}
                {user.phoneNumber && (
                   <div className="text-xs text-muted-foreground mt-1 flex items-center">
                        <Phone className="ml-2 h-3 w-3" />
                        <span>{user.phoneNumber}</span>
                    </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="المستخدمين" />
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
