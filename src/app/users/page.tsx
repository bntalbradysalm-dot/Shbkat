'use client';

import React, { useState } from 'react';
import { collection, doc, updateDoc, increment } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  User as UserIcon,
  Search,
  Trash2,
  Edit,
  MessageSquare,
  Link as LinkIcon,
  PlusCircle
} from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Label } from '@/components/ui/label';

// Define the User type based on your backend.json schema
type User = {
  id: string;
  displayName: string;
  phoneNumber?: string;
  balance?: number;
};

export default function UsersPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const { toast } = useToast();

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );

  const { data: users, isLoading, error } = useCollection<User>(usersCollection);
  
  const handleDelete = (userId: string) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    deleteDocumentNonBlocking(userDocRef);
    toast({
      title: "نجاح",
      description: "تم حذف المستخدم بنجاح.",
    });
  };

  const handleTopUp = async () => {
    if (!selectedUser || !topUpAmount || !firestore) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال مبلغ صالح.",
      });
      return;
    }
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال مبلغ صالح.",
      });
      return;
    }
  
    const userDocRef = doc(firestore, 'users', selectedUser.id);
  
    try {
      await updateDoc(userDocRef, {
        balance: increment(amount)
      });
      toast({
        title: "نجاح",
        description: `تمت إضافة ${amount.toLocaleString('en-US')} ريال إلى رصيد ${selectedUser.displayName}.`,
      });
      setIsTopUpDialogOpen(false);
      setTopUpAmount('');
      setSelectedUser(null);
    } catch (e) {
      console.error("Error updating balance: ", e);
      toast({
        variant: "destructive",
        title: "خطأ في التغذية",
        description: "لم يتم تحديث الرصيد. الرجاء المحاولة مرة أخرى.",
      });
    }
  };


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
      // The FirebaseErrorListener will catch and display the error overlay
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
                      <div className="p-2 rounded-full bg-primary/10">
                          <UserIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-right">
                          <p className="font-bold text-base">{user.displayName || 'مستخدم جديد'}</p>
                          <div className="flex items-center justify-end gap-2 text-muted-foreground text-sm mt-1">
                              <span>{user.phoneNumber}</span>
                              <MessageSquare className="h-4 w-4 text-green-500" />
                          </div>
                      </div>
                  </div>
                  <div className="text-green-600 font-bold text-left">
                      {(user.balance ?? 0).toLocaleString('en-US')} ريال يمني
                  </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل تريد بالتأكيد حذف المستخدم "{user.displayName}"؟ لا يمكن التراجع عن هذا الإجراء.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive hover:bg-destructive/90">
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button variant="outline" size="icon">
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200">
                        <MessageSquare className="ml-2 h-4 w-4" />
                        إيداع وإبلاغ
                    </Button>
                </div>
                 <Dialog open={isTopUpDialogOpen && selectedUser?.id === user.id} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsTopUpDialogOpen(false);
                        setSelectedUser(null);
                        setTopUpAmount('');
                    }
                 }}>
                    <DialogTrigger asChild>
                        <Button variant="outline" onClick={() => {
                            setSelectedUser(user);
                            setIsTopUpDialogOpen(true);
                        }}>
                            <LinkIcon className="ml-2 h-4 w-4" />
                            تغذية
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle>تغذية حساب</DialogTitle>
                        <DialogDescription>
                            أدخل المبلغ الذي تريد إضافته إلى رصيد {selectedUser?.displayName}.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right col-span-1">
                                المبلغ
                                </Label>
                                <Input
                                id="amount"
                                type="number"
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(e.target.value)}
                                className="col-span-3"
                                placeholder="ادخل المبلغ بالريال اليمني"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleTopUp}>تأكيد التغذية</Button>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                إلغاء
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
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
      <Toaster />
    </>
  );
}
