'use client';

import React, { useState, useEffect } from 'react';
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
  Search,
  Trash2,
  Edit,
  MessageSquare,
  PlusCircle,
  Crown,
  Wallet,
} from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';


// Define the User type based on your backend.json schema
type User = {
  id: string;
  displayName: string;
  phoneNumber?: string;
  balance?: number;
  accountType?: 'user' | 'network-owner';
};

const AgentBalanceCard = () => {
    const [balance, setBalance] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAgentBalance = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/echehanly?service=info&action=balance');
                const data = await response.json();
                if (response.ok) {
                    setBalance(data.balance);
                } else {
                    throw new Error(data.message || 'Failed to fetch agent balance.');
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'خطأ في جلب رصيد الوكيل',
                    description: error.message,
                });
                setBalance(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAgentBalance();
    }, [toast]);

    return (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">رصيد الوكيل (اشحن لي)</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-6 w-32" />
                ) : (
                    <div className="text-2xl font-bold text-blue-600">
                        {balance !== null ? `${Number(balance).toLocaleString('en-US')} ريال` : 'تعذر الجلب'}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function UsersPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'user' | 'network-owner'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpDialogOpen, setIsTopUpDialogOpen] = useState(false);
  const [isManualDepositOpen, setIsManualDepositOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingPhoneNumber, setEditingPhoneNumber] = useState('');
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
    const userNotificationsRef = collection(firestore, 'users', selectedUser.id, 'notifications');
  
    try {
      // 1. Update user balance
      await updateDoc(userDocRef, {
        balance: increment(amount)
      });
      
      // 2. Send notification to the user
      await addDoc(userNotificationsRef, {
        title: 'تمت تغذية حسابك',
        body: `تمت إضافة مبلغ ${amount.toLocaleString('en-US')} ريال إلى رصيدك من قبل الإدارة.`,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "نجاح",
        description: `تمت إضافة ${amount.toLocaleString('en-US')} ريال إلى رصيد ${selectedUser.displayName} وإرسال إشعار له.`,
      });
      setIsTopUpDialogOpen(false);
      setTopUpAmount('');
      setSelectedUser(null);
    } catch (e) {
      console.error("Error updating balance and sending notification: ", e);
      toast({
        variant: "destructive",
        title: "خطأ في التغذية",
        description: "لم يتم تحديث الرصيد أو إرسال الإشعار. الرجاء المحاولة مرة أخرى.",
      });
    }
  };
  
  const handleManualDeposit = async () => {
    if (!selectedUser || !topUpAmount || !firestore) {
        toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'الرجاء إدخال مبلغ صالح.',
        });
        return;
    }
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
        toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'الرجاء إدخال مبلغ صالح.',
        });
        return;
    }

    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const userTransactionsRef = collection(firestore, 'users', selectedUser.id, 'transactions');
    const userNotificationsRef = collection(firestore, 'users', selectedUser.id, 'notifications');

    try {
        const batch = writeBatch(firestore);

        // 1. Update user balance
        batch.update(userDocRef, { balance: increment(amount) });

        // 2. Add transaction record
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

هذه الرسالة صادرة تلقائيًا من تطبيق شبكات
— دقة. أمان. ثقة

*رصيدك: (${newBalance.toLocaleString('en-US')}) ريال يمني*`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=967${selectedUser.phoneNumber}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');


        toast({
            title: 'نجاح',
            description: `تم إيداع مبلغ ${amount.toLocaleString('en-US')} ريال في حساب ${selectedUser.displayName}.`,
        });

        setIsManualDepositOpen(false);
        setTopUpAmount('');
        setSelectedUser(null);

    } catch (e) {
        console.error('Error during manual deposit:', e);
        toast({
            variant: 'destructive',
            title: 'خطأ',
            description: 'فشل تحديث الرصيد أو تسجيل العملية. الرجاء المحاولة مرة أخرى.',
        });
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
    const nameParts = editingName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
  
    try {
      await updateDoc(userDocRef, {
        displayName: editingName,
        phoneNumber: editingPhoneNumber,
        firstName: firstName,
        lastName: lastName,
        email: `${editingPhoneNumber}@shabakat.com`,
      });
      toast({
        title: "نجاح",
        description: "تم تحديث معلومات المستخدم بنجاح.",
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    } catch (e) {
      console.error("Error updating user: ", e);
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: "لم يتم تحديث معلومات المستخدم. الرجاء المحاولة مرة أخرى.",
      });
    }
  };

  const openWhatsAppWithMessage = (phoneNumber: string) => {
    const message = encodeURIComponent('السلام عليكم');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=967${phoneNumber}&text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };


  const filteredUsers = users?.filter(user => {
    const searchMatch = (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phoneNumber?.includes(searchTerm));
    
    if (accountTypeFilter === 'all') {
      return searchMatch;
    }
    if (accountTypeFilter === 'network-owner') {
      return searchMatch && user.accountType === 'network-owner';
    }
    // accountTypeFilter === 'user'
    return searchMatch && user.accountType !== 'network-owner';
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
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-primary/10">
                          <UserIcon className="h-5 w-5 text-primary dark:text-primary-foreground" />
                      </div>
                      <div className="text-right">
                          <div className='flex items-center gap-2'>
                            <p className="font-bold text-sm">{user.displayName || 'مستخدم جديد'}</p>
                            {user.accountType === 'network-owner' && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                    <Crown className="h-3 w-3" />
                                    مالك شبكة
                                </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-end gap-2 text-muted-foreground text-xs mt-1">
                              <span>{user.phoneNumber}</span>
                              {user.phoneNumber && (
                                <button onClick={() => openWhatsAppWithMessage(user.phoneNumber!)} title="مراسلة عبر واتساب" className="text-green-600 font-semibold hover:underline">
                                    واتساب
                                </button>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="text-primary dark:text-primary-foreground font-bold text-left text-sm">
                      {(user.balance ?? 0).toLocaleString('en-US')} ريال
                  </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" className="h-8 w-8">
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

                    <Button variant="outline" size="icon" onClick={() => handleEditClick(user)} className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Dialog open={isManualDepositOpen && selectedUser?.id === user.id} onOpenChange={(isOpen) => {
                      if (!isOpen) {
                          setIsManualDepositOpen(false);
                          setSelectedUser(null);
                          setTopUpAmount('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => {
                            setSelectedUser(user);
                            setIsManualDepositOpen(true);
                        }}>
                            <Wallet className="ml-1 h-4 w-4" />
                            إيداع مع إبلاغ
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                              <DialogTitle>إيداع مع إبلاغ</DialogTitle>
                              <DialogDescription>
                                  أدخل المبلغ لإضافته إلى رصيد {selectedUser?.displayName} وإبلاغه عبر واتساب.
                              </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="deposit-amount" className="text-right col-span-1">المبلغ</Label>
                                  <Input id="deposit-amount" type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="col-span-3" placeholder="ادخل المبلغ بالريال اليمني" />
                              </div>
                          </div>
                          <DialogFooter>
                              <Button type="submit" onClick={handleManualDeposit}>تأكيد الإيداع</Button>
                              <DialogClose asChild><Button type="button" variant="secondary">إلغاء</Button></DialogClose>
                          </DialogFooter>
                      </DialogContent>
                    </Dialog>

                </div>
                 <Dialog open={isTopUpDialogOpen && selectedUser?.id === user.id} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsTopUpDialogOpen(false);
                        setSelectedUser(null);
                        setTopUpAmount('');
                    }
                 }}>
                    <DialogTrigger asChild>
                        <Button variant="default" size="sm" onClick={() => {
                            setSelectedUser(user);
                            setIsTopUpDialogOpen(true);
                        }}>
                            <PlusCircle className="ml-1 h-4 w-4" />
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
          <AgentBalanceCard />
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
            <SelectTrigger>
              <SelectValue placeholder="فلترة حسب نوع الحساب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="user">مستخدمون فقط</SelectItem>
              <SelectItem value="network-owner">ملاك الشبكات فقط</SelectItem>
            </SelectContent>
          </Select>
          {renderContent()}
        </div>
      </div>
      <Toaster />

      {editingUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setIsEditDialogOpen(false);
                setEditingUser(null);
            }
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
                    <DialogDescription>
                        قم بتعديل معلومات {editingUser.displayName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">الاسم الكامل</Label>
                        <Input
                            id="edit-name"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-phone">رقم الهاتف</Label>
                        <Input
                            id="edit-phone"
                            type="tel"
                            value={editingPhoneNumber}
                            onChange={(e) => setEditingPhoneNumber(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSaveChanges}>حفظ التغييرات</Button>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">إلغاء</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
