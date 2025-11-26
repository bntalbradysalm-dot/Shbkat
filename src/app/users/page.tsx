'use client';

import React, { useState } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User as UserIcon,
  Search,
  Trash2,
  Edit,
  MessageSquare,
  Link as LinkIcon,
  ChevronRight,
} from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';

// Define the User type based on your backend.json schema
type User = {
  id: string;
  displayName?: string;
  phoneNumber?: string;
  balance?: number;
};

export default function UsersPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );

  const { data: users, isLoading, error } = useCollection<User>(usersCollection);

  const filteredUsers = users?.filter(user => {
    const nameMatch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = user.phoneNumber?.includes(searchTerm);
    return (nameMatch || phoneMatch) && (filter === 'all' /* Add other filter logic here if needed */);
  });

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-center">جاري تحميل المستخدمين...</p>;
    }
    if (error) {
      console.error(error);
      return <p className="text-center text-destructive">حدث خطأ أثناء جلب المستخدمين.</p>;
    }
    if (!filteredUsers || filteredUsers.length === 0) {
      return <p className="text-center">لا يوجد مستخدمين لعرضهم.</p>;
    }
    return (
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                      <div className="text-right">
                          <p className="font-bold text-base">{user.displayName || 'مستخدم غير معروف'}</p>
                          <div className="flex items-center justify-end gap-2 text-muted-foreground text-sm mt-1">
                              <span>{user.phoneNumber}</span>
                              <MessageSquare className="h-4 w-4 text-green-500" />
                          </div>
                      </div>
                      <div className="p-2 rounded-full bg-primary/10">
                          <UserIcon className="h-6 w-6 text-primary" />
                      </div>
                  </div>
                  <div className="text-green-600 font-bold text-left">
                      {(user.balance ?? 0).toLocaleString('en-US')} ريال يمني
                  </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                        <MessageSquare className="ml-2 h-4 w-4" />
                        إيداع وإبلاغ
                    </Button>
                </div>
                <Button variant="outline">
                    <LinkIcon className="ml-2 h-4 w-4" />
                    تغذية
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="إدارة المستخدمين" />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                type="text"
                placeholder="البحث بالاسم أو رقم الهاتف..."
                className="w-full pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
                <SelectValue placeholder="الكل" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
        </Select>
        {renderContent()}
      </div>
    </div>
  );
}
