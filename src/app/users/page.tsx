'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, updateDoc, increment, addDoc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User as UserIcon,
  Users,
  Search,
  Trash2,
  Edit,
  MessageSquare,
  PlusCircle,
  Crown,
  Wallet,
  Banknote,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type User = {
  id: string;
  displayName: string;
  phoneNumber?: string;
  balance?: number;
  accountType?: 'user' | 'network-owner';
};

export default function UsersPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'user' | 'network-owner' | 'with-balance'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [isManualDepositOpen, setIsManualDepositOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingPhoneNumber, setEditingPhoneNumber] = useState('');
  
  const { toast } = useToast();

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );

  const { data: users, isLoading, error } = useCollection<User>(usersCollection);

  const totalUsersBalance = useMemo(() => {
    if (!users) return 0;
    return users.reduce((acc, user) => acc + (user.balance ?? 0), 0);
  }, [users]);
  
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
    const userNotificationsRef = collection(firestore, 'users', selectedUser.id, 'notifications');
  
    try {
      await updateDoc(userDocRef, {
        balance: increment(amount)
      });
      
      await addDoc(userNotificationsRef, {
        title: 'تمت تغذية حسابك',
        body: `تمت إضافة مبلغ ${amount.toLocaleString('en-US')} ريال إلى رصيدك من قبل الإدارة.`,
        timestamp: new Date().toISOString()
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
  
  const handleManualDeposit = async () => {
    if (!selectedUser || !topUpAmount || !firestore) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صالح.' });
        return;
    }
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال مبلغ صالح.' });
        return;
    }

    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const userTransactionsRef = collection(firestore, 'users', selectedUser.id, 'transactions');

    try {
        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(amount) });
        const transactionDoc = doc(userTransactionsRef);
        batch.set(transactionDoc, {
            userId: selectedUser.id,
            transactionDate: new Date().toISOString(),
            amount: amount,
            transactionType: 'إيداع يدوي',
            notes: 'إيداع من الإدارة',
        });
        await batch.commit();

        const newBalance = (selectedUser.balance ?? 0) + amount;
        const depositDate = format(new Date(), 'd/M/yyyy h:mm a', { locale: ar });

        const message = `📩 *عملية إيداع من تطبيق شبكات*
        
تم بنجاح إيداع مبلغ (${amount.toLocaleString('en-US')}) ريال يمني في حسابك (${selectedUser.phoneNumber}) بتاريخ (${depositDate})
يُرجى التحقق من الرصيد عبر تطبيق شبكات للتأكد من تفاصيل العملية 🔒

*رصيدك: (${newBalance.toLocaleString('en-US')}) ريال يمني*`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=967${selectedUser.phoneNumber}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

        toast({
            title: 'نجاح',
            description: `تم إيداع مبلغ ${amount.toLocaleString('en-US')} ريال بنجاح.`,
        });

        setIsManualDepositOpen(false);
        setTopUpAmount('');
        setSelectedUser(null);
    } catch (e) {
        console.error('Error during manual deposit:', e);
        toast({ variant: 'destructive', title: 'خطأ', description: 'فشل تنفيذ عملية الإيداع.' });
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditingName(user.displayName);
    setEditingPhoneNumber(user.phoneNumber || '');
    setIsEditDialogOpen(true);
  };
  
  const handleSaveChanges = async () => {
    if (!editingUser || !firestore) return;
    const userDocRef = doc(firestore, 'users', editingUser.id);
    try {
      await updateDoc(userDocRef, {
        displayName: editingName,
        phoneNumber: editingPhoneNumber,
      });
      toast({ title: "نجاح", description: "تم تحديث معلومات المستخدم بنجاح." });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "لم يتم التحديث." });
    }
  };

  const handleWithdraw = async () => {
    if (!selectedUser || !withdrawAmount || !firestore) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) return;
    if ((selectedUser.balance ?? 0) < amount) {
        toast({ variant: "destructive", title: "رصيد غير كافٍ" });
        return;
    }
  
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const userTransactionsRef = collection(firestore, 'users', selectedUser.id, 'transactions');
  
    try {
      const batch = writeBatch(firestore);
      batch.update(userDocRef, { balance: increment(-amount) });
      batch.set(doc(userTransactionsRef), {
        userId: selectedUser.id,
        transactionDate: new Date().toISOString(),
        amount: amount,
        transactionType: 'سحب نقدي',
        notes: 'سحب نقدي من قبل الإدارة',
      });
      await batch.commit();
      toast({ title: "نجاح", description: `تم سحب ${amount.toLocaleString('en-US')} ريال.` });
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount('');
      setSelectedUser(null);
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ" });
    }
  };

  const openWhatsAppWithMessage = (phoneNumber: string) => {
    const message = encodeURIComponent('السلام عليكم');
    window.open(`https://api.whatsapp.com/send?phone=967${phoneNumber}&text=${message}`, '_blank');
  };

  const filteredUsers = users?.filter(user => {
    const searchMatch = (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phoneNumber?.includes(searchTerm));
    
    if (!searchMatch) return false;

    if (accountTypeFilter === 'all') return true;
    if (accountTypeFilter === 'network-owner') return user.accountType === 'network-owner';
    if (accountTypeFilter === 'user') return user.accountType === 'user' || !user.accountType;
    if (accountTypeFilter === 'with-balance') return (user.balance ?? 0) > 0;
    
    return true;
  });

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="إدارة المستخدمين" />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي أرصدة العملاء</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-primary">
                    {totalUsersBalance.toLocaleString('en-US')}
                    <span className="text-base ml-1"> ريال</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">مجموع أرصدة جميع المستخدمين في النظام.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{(users?.length ?? 0).toLocaleString('en-US')}</div>}
                <p className="text-xs text-muted-foreground">إجمالي الحسابات.</p>
              </CardContent>
            </Card>
          </div>
          
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
          
          <Select value={accountTypeFilter} onValueChange={(value) => setAccountTypeFilter(value as any)}>
            <SelectTrigger><SelectValue placeholder="فلترة حسب نوع الحساب" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="user">مستخدمون فقط</SelectItem>
              <SelectItem value="network-owner">ملاك الشبكات فقط</SelectItem>
              <SelectItem value="with-balance">عملاء لديهم رصيد</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-3">
            {isLoading ? <Skeleton className="h-24 w-full" /> : filteredUsers?.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-primary/10">
                              <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="text-right">
                              <div className='flex items-center gap-2'>
                                <p className="font-bold text-sm">{user.displayName}</p>
                                {user.accountType === 'network-owner' && <Badge variant="secondary" className="h-5 text-[9px]"><Crown className="h-3 w-3 ml-1" />مالك</Badge>}
                              </div>
                              <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs mt-1">
                                  <span>{user.phoneNumber}</span>
                                  <button onClick={() => openWhatsAppWithMessage(user.phoneNumber!)} className="text-green-600 font-bold hover:underline">واتساب</button>
                              </div>
                          </div>
                      </div>
                      <div className="text-primary font-bold text-sm">{(user.balance ?? 0).toLocaleString('en-US')} ريال</div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Link href={`/users/${user.id}/report`}><Button variant="outline" size="icon" className="h-8 w-8"><FileText className="h-4 w-4" /></Button></Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>حذف المستخدم؟</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive">حذف</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" size="icon" onClick={() => handleEditClick(user)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => { setSelectedUser(user); setIsWithdrawDialogOpen(true); }}><Banknote className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setSelectedUser(user); setIsManualDepositOpen(true); }}><Wallet className="h-4 w-4" /></Button>
                    <Button variant="default" size="icon" className="h-8 w-8" onClick={() => { setSelectedUser(user); setIsTopUpDialogOpen(true); }}><PlusCircle className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Toaster />

      {/* Dialogs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>تعديل مستخدم</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Input value={editingName} onChange={e => setEditingName(e.target.value)} placeholder="الاسم الكامل" />
                <Input value={editingPhoneNumber} onChange={e => setEditingPhoneNumber(e.target.value)} placeholder="رقم الهاتف" />
            </div>
            <DialogFooter><Button onClick={handleSaveChanges}>حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>تغذية حساب</DialogTitle></DialogHeader>
            <div className="py-4"><Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="المبلغ" /></div>
            <DialogFooter><Button onClick={handleTopUp}>تأكيد</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManualDepositOpen} onOpenChange={setIsManualDepositOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>إيداع وتبليغ</DialogTitle></DialogHeader>
            <div className="py-4"><Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="المبلغ" /></div>
            <DialogFooter><Button onClick={handleManualDeposit}>إيداع وإرسال واتساب</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>سحب نقدي</DialogTitle></DialogHeader>
            <div className="py-4"><Input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="المبلغ" /></div>
            <DialogFooter><Button onClick={handleWithdraw}>تأكيد السحب</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
