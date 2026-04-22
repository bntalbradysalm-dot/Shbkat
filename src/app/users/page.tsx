'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, doc, updateDoc, increment, query, orderBy, writeBatch, setDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, useDoc, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
  User as UserIcon,
  Users,
  Search,
  Trash2,
  Edit,
  PlusCircle,
  Crown,
  Wallet,
  Banknote,
  FileText,
  LayoutGrid,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale,
  MapPin
} from 'lucide-react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type User = {
  id: string;
  displayName: string;
  phoneNumber?: string;
  balance?: number;
  accountType?: 'user' | 'network-owner';
  registrationDate?: string;
  location?: string;
};

type AppSettings = {
    boxBalance?: number;
    totalDebts?: number;
};

const filterOptions = [
    { label: 'الكل', value: 'all', icon: LayoutGrid },
    { label: 'لديه رصيد', value: 'with-balance', icon: Wallet },
    { label: 'مستخدمون', value: 'user', icon: UserIcon },
    { label: 'ملاك شبكات', value: 'network-owner', icon: Crown },
];

export default function UsersPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'user' | 'with-balance' | 'network-owner'>('all');
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
  
  const [agentBalance, setAgentBalance] = useState<string | null>(null);
  const [baityBalance, setBaityBalance] = useState<string | null>(null);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);

  const [isBoxEditingOpen, setIsBoxEditingOpen] = useState(false);
  const [isDebtsEditingOpen, setIsDebtsEditingOpen] = useState(false);
  const [newBoxValue, setNewBoxValue] = useState('');
  const [newDebtsValue, setNewDebtsValue] = useState('');

  const isUserAdmin = user?.email === '770326828@shabakat.com' || user?.uid === 'wsy8bUcULSYX2J9Q9WyisiFX5ki2';

  const usersCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users'), orderBy('registrationDate', 'desc')) : null),
    [firestore]
  );
  const { data: users, isLoading } = useCollection<User>(usersCollection);

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'appSettings', 'global') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

  const boxBalance = appSettings?.boxBalance ?? 0;
  const totalDebts = appSettings?.totalDebts ?? 0;

  const totalUsersBalance = useMemo(() => {
    if (!users) return 0;
    return users.reduce((acc, user) => {
      if (user.phoneNumber === '770326828') return acc;
      return acc + (user.balance ?? 0);
    }, 0);
  }, [users]);

  const fetchAllBalances = useCallback(async () => {
    if (!isUserAdmin) return;
    setIsFetchingBalances(true);
    try {
      const transid = Date.now().toString().slice(-8);
      
      const telecomPromise = fetch('/api/telecom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'balance',
            mobile: '770326828',
            transid: transid,
        })
      }).then(res => res.json());

      const baityPromise = fetch('/api/baitynet/balance').then(res => res.json());

      const [telecomResult, baityResult] = await Promise.all([telecomPromise, baityPromise]);
      
      if (telecomResult && (telecomResult.resultCode === "0" || telecomResult.resultCode === 0) && telecomResult.balance !== undefined) {
        setAgentBalance(String(telecomResult.balance));
      } else {
        setAgentBalance('خطأ');
      }

      if (baityResult && baityResult.status === 200 && baityResult.data) {
        setBaityBalance(String(baityResult.data.balance || '0'));
      } else {
        setBaityBalance('خطأ');
      }

    } catch (e) {
      setAgentBalance('خطأ');
      setBaityBalance('خطأ');
      console.error("Agent Balances Fetch Failed:", e);
    } finally {
      setIsFetchingBalances(false);
    }
  }, [isUserAdmin]);

  useEffect(() => {
    fetchAllBalances();
  }, [fetchAllBalances]);

  const combinedProvidersBalance = useMemo(() => {
    const agent = parseFloat(agentBalance || '0');
    const baity = parseFloat(baityBalance || '0');
    const box = boxBalance;
    const debts = totalDebts;
    
    const safeAgent = isNaN(agent) ? 0 : agent;
    const safeBaity = isNaN(baity) ? 0 : baity;
    
    return safeAgent + safeBaity + box + debts;
  }, [agentBalance, baityBalance, boxBalance, totalDebts]);

  const netProfit = useMemo(() => {
    return combinedProvidersBalance - totalUsersBalance;
  }, [combinedProvidersBalance, totalUsersBalance]);
  
  const handleDelete = (userId: string) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', userId);
    deleteDocumentNonBlocking(userDocRef);
    toast({ title: "نجاح", description: "تم حذف المستخدم بنجاح." });
  };

  const handleTopUp = async () => {
    if (!selectedUser || !topUpAmount || !firestore) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;
  
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const userNotificationsRef = collection(firestore, 'users', selectedUser.id, 'notifications');
  
    try {
      await updateDoc(userDocRef, { balance: increment(amount) });
      const batch = writeBatch(firestore);
      batch.set(doc(userNotificationsRef), {
        title: 'تمت تغذية حسابك',
        body: `تمت إضافة مبلغ ${amount.toLocaleString('en-US')} ريال إلى رصيدك.`,
        timestamp: new Date().toISOString()
      });
      await batch.commit();
      toast({ title: "نجاح", description: `تمت إضافة الرصيد بنجاح.` });
      setIsTopUpDialogOpen(false);
      setTopUpAmount('');
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في التغذية" });
    }
  };
  
  const handleManualDeposit = async () => {
    if (!selectedUser || !topUpAmount || !firestore) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;

    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const userTransactionsRef = collection(firestore, 'users', selectedUser.id, 'transactions');

    try {
        const batch = writeBatch(firestore);
        batch.update(userDocRef, { balance: increment(amount) });
        batch.set(doc(userTransactionsRef), {
            userId: selectedUser.id,
            transactionDate: new Date().toISOString(),
            amount: amount,
            transactionType: 'إيداع رصيد',
            notes: 'إيداع من الإدارة',
        });
        await batch.commit();

        const newBalance = (selectedUser.balance ?? 0) + amount;
        const depositDate = format(new Date(), 'd/M/yyyy h:mm a', { locale: ar });
        const message = `📩 *عملية إيداع*\nتم إيداع مبلغ (${amount.toLocaleString('en-US')}) ريال في حسابك بتاريخ (${depositDate})\n*رصيدك: (${newBalance.toLocaleString('en-US')}) ريال*`;
        window.open(`https://api.whatsapp.com/send?phone=967${selectedUser.phoneNumber}&text=${encodeURIComponent(message)}`, '_blank');

        toast({ title: 'نجاح', description: `تم الإيداع بنجاح.` });
        setIsManualDepositOpen(false);
        setTopUpAmount('');
    } catch (e) {
        toast({ variant: 'destructive', title: 'خطأ' });
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
    try {
      await updateDoc(doc(firestore, 'users', editingUser.id), { displayName: editingName, phoneNumber: editingPhoneNumber });
      toast({ title: "نجاح", description: "تم تحديث المعلومات." });
      setIsEditDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ" });
    }
  };

  const handleWithdraw = async () => {
    if (!selectedUser || !withdrawAmount || !firestore) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || (selectedUser.balance ?? 0) < amount) return;
  
    try {
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'users', selectedUser.id), { balance: increment(-amount) });
      batch.set(doc(collection(firestore, 'users', selectedUser.id, 'transactions')), {
        userId: selectedUser.id,
        transactionDate: new Date().toISOString(),
        amount: amount,
        transactionType: 'سحب نقدي',
        notes: 'سحب نقدي من الإدارة',
      });
      await batch.commit();
      toast({ title: "نجاح", description: `تم السحب بنجاح.` });
      setIsWithdrawDialogOpen(false);
      setWithdrawAmount('');
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ" });
    }
  };

  const handleSaveBoxBalance = async () => {
    if (!firestore || !settingsDocRef) return;
    const val = parseFloat(newBoxValue);
    if (isNaN(val)) return;

    try {
        await setDoc(settingsDocRef, { boxBalance: val }, { merge: true });
        toast({ title: "تم التحديث", description: "تم تحديث مبلغ الصندوق بنجاح." });
        setIsBoxEditingOpen(false);
    } catch (e) {
        toast({ variant: "destructive", title: "فشل التحديث" });
    }
  };

  const handleSaveTotalDebts = async () => {
    if (!firestore || !settingsDocRef) return;
    const val = parseFloat(newDebtsValue);
    if (isNaN(val)) return;

    try {
        await setDoc(settingsDocRef, { totalDebts: val }, { merge: true });
        toast({ title: "تم التحديث", description: "تم تحديث إجمالي الديون بنجاح." });
        setIsDebtsEditingOpen(false);
    } catch (e) {
        toast({ variant: "destructive", title: "فشل التحديث" });
    }
  };

  const filteredUsers = users?.filter(user => {
    const searchMatch = (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || user.phoneNumber?.includes(searchTerm));
    if (!searchMatch) return false;
    if (accountTypeFilter === 'all') return true;
    if (accountTypeFilter === 'user') return user.accountType === 'user' || !user.accountType;
    if (accountTypeFilter === 'with-balance') return (user.balance ?? 0) > 0;
    if (accountTypeFilter === 'network-owner') return user.accountType === 'network-owner';
    return true;
  });

  const formatBalanceDisplay = (val: string | null) => {
    if (val === 'خطأ' || val === null) return 'خطأ';
    const num = parseFloat(val);
    if (isNaN(num)) return 'خطأ';
    return num.toLocaleString('en-US');
  };

  if (!isUserAdmin) {
      return <div className="p-10 text-center font-bold">عذراً، هذه الصفحة مخصصة لمدير النظام فقط.</div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background">
        <SimpleHeader title="إدارة المستخدمين" />
        <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-6 no-scrollbar">
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
                <Card className="relative overflow-hidden border-none shadow-lg bg-mesh-gradient text-white rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-3">
                        <CardTitle className="text-[7px] font-black opacity-80 uppercase tracking-tight">رصيد شحنلي</CardTitle>
                        <RefreshCw 
                            className={cn("h-2.5 w-2.5 opacity-50 cursor-pointer", isFetchingBalances && "animate-spin")} 
                            onClick={fetchAllBalances}
                        />
                    </CardHeader>
                    <CardContent className="px-3 pb-4">
                        <div className="flex items-baseline gap-0.5">
                            <h2 className="text-lg font-black text-white truncate">
                                {isFetchingBalances ? <Skeleton className="h-4 w-12 bg-white/20" /> : formatBalanceDisplay(agentBalance)}
                            </h2>
                            <span className="text-[7px] font-bold opacity-70">ر.ي</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-green-400 to-green-600 text-white rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-3">
                        <CardTitle className="text-[7px] font-black opacity-80 uppercase tracking-tight">رصيد بيتي</CardTitle>
                        <RefreshCw 
                            className={cn("h-2.5 w-2.5 opacity-50 cursor-pointer", isFetchingBalances && "animate-spin")} 
                            onClick={fetchAllBalances}
                        />
                    </CardHeader>
                    <CardContent className="px-3 pb-4">
                        <div className="flex items-baseline gap-0.5">
                            <h2 className="text-lg font-black text-white truncate">
                                {isFetchingBalances ? <Skeleton className="h-4 w-12 bg-white/20" /> : formatBalanceDisplay(baityBalance)}
                            </h2>
                            <span className="text-[7px] font-bold opacity-70">ر.ي</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-rose-500 to-red-700 text-white rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-3">
                        <CardTitle className="text-[7px] font-black opacity-80 uppercase tracking-tight">الصندوق</CardTitle>
                        <Edit 
                            className="h-2.5 w-2.5 opacity-50 cursor-pointer" 
                            onClick={() => {
                                setNewBoxValue(String(boxBalance));
                                setIsBoxEditingOpen(true);
                            }}
                        />
                    </CardHeader>
                    <CardContent className="px-3 pb-4">
                        <div className="flex items-baseline gap-0.5">
                            <h2 className="text-lg font-black text-white truncate">
                                {boxBalance.toLocaleString('en-US')}
                            </h2>
                            <span className="text-[7px] font-bold opacity-70">ر.ي</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-md bg-muted/40 rounded-[28px] p-4 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-500">
                <div className="space-y-1 text-right border-l border-muted-foreground/10 px-1">
                    <div className="flex items-center gap-1 mb-1">
                        <BarChart3 className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-black text-primary/80 uppercase tracking-tighter">الرصيد المجمع</span>
                    </div>
                    <div className="text-base font-black text-primary truncate">
                        {isFetchingBalances ? <Skeleton className="h-4 w-12" /> : (combinedProvidersBalance).toLocaleString('en-US', { maximumFractionDigits: 0 })} 
                    </div>
                </div>
                
                <div className="space-y-1 text-right border-l border-muted-foreground/10 px-1">
                    <div className="flex items-center gap-1 mb-1">
                        {netProfit >= 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
                        <span className={cn("text-[9px] font-black uppercase tracking-tighter", netProfit >= 0 ? "text-green-600/80" : "text-red-600/80")}>
                            {netProfit >= 0 ? 'الأرباح' : 'العجز'}
                        </span>
                    </div>
                    <div className={cn("text-base font-black truncate", netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                        {Math.abs(netProfit).toLocaleString('en-US', { maximumFractionDigits: 0 })} 
                    </div>
                </div>

                <div className="space-y-1 text-right px-1 cursor-pointer hover:bg-muted/50 transition-colors rounded-xl p-1" onClick={() => {
                    setNewDebtsValue(String(totalDebts));
                    setIsDebtsEditingOpen(true);
                }}>
                    <div className="flex items-center gap-1 mb-1">
                        <Scale className="h-3 w-3 text-orange-600" />
                        <span className="text-[9px] font-black text-orange-600/80 uppercase tracking-tighter">الديون</span>
                    </div>
                    <div className="text-base font-black text-orange-600 truncate">
                        {totalDebts.toLocaleString('en-US')} 
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card className="relative overflow-hidden border-none shadow-sm bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-black text-primary uppercase tracking-widest">إجمالي الأرصدة</CardTitle>
                    <Wallet className="h-4 w-4 text-primary opacity-50" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-10 w-32" /> : <div className="text-2xl font-black text-primary">{totalUsersBalance.toLocaleString('en-US')} <span className="text-[10px]">ريال</span></div>}
                </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">المستخدمين</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground opacity-50" />
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-10 w-24" /> : <div className="text-2xl font-black">{(users?.length ?? 0).toLocaleString('en-US')}</div>}
                </CardContent>
                </Card>
            </div>
          </div>
          
          <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="ابحث عن مستخدم..." 
                className="w-full pr-10 h-12 rounded-2xl bg-muted/20 border-none focus-visible:ring-primary transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
          </div>
          
          <div>
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1 mb-3">تصفية المستخدمين</h3>
            <div className="grid grid-cols-2 gap-3">
                {filterOptions.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setAccountTypeFilter(opt.value as any)}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 gap-2",
                            accountTypeFilter === opt.value
                                ? "border-primary bg-primary/5 text-primary shadow-sm scale-[1.02]"
                                : "border-transparent bg-card text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        <opt.icon className={cn("h-5 w-5", accountTypeFilter === opt.value ? "text-primary" : "text-muted-foreground/60")} />
                        <span className="text-[11px] font-black">{opt.label}</span>
                    </button>
                ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center px-1 mb-1">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">النتائج ({filteredUsers?.length || 0})</h3>
            </div>
            {isLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)
            ) : filteredUsers?.length === 0 ? (
                <div className="text-center py-10 opacity-30">
                    <Users className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-xs font-bold">لا يوجد مستخدمون مطابقون</p>
                </div>
            ) : (
                filteredUsers?.map((user) => (
                <Card key={user.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/5 shadow-inner">
                                <UserIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-right space-y-0.5">
                                <div className='flex items-center gap-2'>
                                    <p className="font-black text-sm text-foreground">{user.displayName}</p>
                                    {user.accountType === 'network-owner' && (
                                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black h-4 px-1.5 rounded-md">
                                            مالك
                                        </Badge>
                                    )}
                                </div>
                                {user.location && (
                                    <p className="text-[10px] font-black text-primary/70 flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {user.location}
                                    </p>
                                )}
                                <p className="text-muted-foreground text-[10px] font-bold font-mono tracking-wider">{user.phoneNumber}</p>
                            </div>
                        </div>
                        <div className="text-primary font-black text-sm pt-1">
                            {user.balance?.toLocaleString('en-US')} <span className="text-[9px] font-bold opacity-70">ر.ي</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-muted/50 flex items-center justify-end gap-2">
                        <Link href={`/users/${user.id}/report`}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted/30 text-muted-foreground hover:text-primary hover:bg-primary/5">
                                <FileText className="h-4 w-4" />
                            </Button>
                        </Link>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted/30 text-muted-foreground hover:text-destructive hover:bg-destructive/5">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[32px]">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-center font-black">حذف المستخدم؟</AlertDialogTitle>
                                <AlertDialogDescription className="text-center">سيتم حذف المستخدم وبياناته نهائياً من النظام.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="grid grid-cols-2 gap-3 pt-4 sm:space-x-0">
                                <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(user.id)} className="w-full rounded-2xl h-12 bg-destructive hover:bg-destructive/90 font-bold">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)} className="h-9 w-9 rounded-xl bg-muted/30 text-muted-foreground hover:text-primary hover:bg-primary/5">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setIsWithdrawDialogOpen(true); }} className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20">
                            <Banknote className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setIsManualDepositOpen(true); }} className="h-9 w-9 rounded-xl bg-primary/10 text-primary hover:bg-primary/20">
                            <Wallet className="h-4 w-4" />
                        </Button>
                        <Button variant="default" size="icon" onClick={() => { setSelectedUser(user); setIsTopUpDialogOpen(true); }} className="h-9 w-9 rounded-xl shadow-lg shadow-primary/20">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                    </CardContent>
                </Card>
                ))
            )}
          </div>
        </div>
      </div>
      <Toaster />

      {/* Dialogs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-[32px] max-sm p-6 [&>button]:hidden">
            <DialogHeader>
                <DialogTitle className="text-center font-black">تعديل بيانات المستخدم</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase mr-1">الاسم الرباعي</Label>
                    <Input value={editingName} onChange={e => setEditingName(e.target.value)} placeholder="الاسم الكامل" className="h-12 rounded-2xl" />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase mr-1">رقم الهاتف</Label>
                    <Input value={editingPhoneNumber} onChange={e => setEditingPhoneNumber(e.target.value)} placeholder="7xxxxxxxx" className="h-12 rounded-2xl" />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSaveChanges} className="w-full h-12 rounded-2xl font-black">حفظ التغييرات</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTopUpDialogOpen} onOpenChange={setIsTopUpDialogOpen}>
        <DialogContent className="rounded-[32px] max-sm p-6 [&>button]:hidden">
            <DialogHeader>
                <DialogTitle className="text-center font-black">تغذية رصيد (صامتة)</DialogTitle>
                <DialogDescription className="text-center">سيتم إضافة المبلغ للرصيد مع إشعار داخلي فقط.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label className="text-[10px] font-black text-muted-foreground uppercase mr-1">المبلغ المطلوب إضافته</Label>
                <Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl text-center text-xl font-black" />
            </div>
            <DialogFooter>
                <Button onClick={handleTopUp} className="w-full h-12 rounded-2xl font-black">تأكيد التغذية</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManualDepositOpen} onOpenChange={setIsManualDepositOpen}>
        <DialogContent className="rounded-[32px] max-sm p-6 [&>button]:hidden">
            <DialogHeader>
                <DialogTitle className="text-center font-black">إيداع وتبليغ واتساب</DialogTitle>
                <DialogDescription className="text-center">سيتم إضافة المبلغ وإرسال رسالة واتساب للعميل.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label className="text-[10px] font-black text-muted-foreground uppercase mr-1">مبلغ الإيداع</Label>
                <Input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl text-center text-xl font-black" />
            </div>
            <DialogFooter>
                <Button onClick={handleManualDeposit} className="w-full h-12 rounded-2xl font-black">تأكيد وإرسال واتساب</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
        <DialogContent className="rounded-[32px] max-sm p-6 [&>button]:hidden">
            <DialogHeader>
                <DialogTitle className="text-center font-black">سحب نقدي من الرصيد</DialogTitle>
                <DialogDescription className="text-center">سيتم خصم المبلغ من رصيد المستخدم حالاً.</DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
                <p className="text-[10px] font-bold text-primary mb-2">الرصيد المتاح: {selectedUser?.balance?.toLocaleString()} ريال</p>
                <Label className="text-[10px] font-black text-muted-foreground uppercase mr-1">المبلغ المراد سحبه</Label>
                <Input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl text-center text-xl font-black border-destructive/20 focus-visible:ring-destructive" />
            </div>
            <DialogFooter>
                <Button onClick={handleWithdraw} className="w-full h-12 rounded-2xl font-black bg-destructive hover:bg-destructive/90">تأكيد السحب النقدي</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBoxEditingOpen} onOpenChange={setIsBoxEditingOpen}>
        <DialogContent className="rounded-[32px] max-sm p-6 [&>button]:hidden">
            <DialogHeader>
                <DialogTitle className="text-center font-black">تعديل مبلغ الصندوق</DialogTitle>
                <DialogDescription className="text-center">أدخل المبلغ الحالي المتوفر في الصندوق يدوياً.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label className="text-[10px] font-black text-muted-foreground uppercase mr-1">المبلغ الحالي</Label>
                <Input type="number" value={newBoxValue} onChange={e => setNewBoxValue(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl text-center text-xl font-black border-red-200 focus-visible:ring-red-500" />
            </div>
            <DialogFooter>
                <Button onClick={handleSaveBoxBalance} className="w-full h-12 rounded-2xl font-black bg-red-600 hover:bg-red-700">تحديث المبلغ</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDebtsEditingOpen} onOpenChange={setIsDebtsEditingOpen}>
        <DialogContent className="rounded-[32px] max-sm p-6 [&>button]:hidden">
            <DialogHeader>
                <DialogTitle className="text-center font-black">تعديل إجمالي الديون</DialogTitle>
                <DialogDescription className="text-center">أدخل المبلغ الإجمالي للديون المستحقة عند العملاء.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label className="text-[10px] font-black text-muted-foreground uppercase mr-1">إجمالي مبلغ الديون</Label>
                <Input type="number" value={newDebtsValue} onChange={e => setNewDebtsValue(e.target.value)} placeholder="0.00" className="h-12 rounded-2xl text-center text-xl font-black border-orange-200 focus-visible:ring-orange-500" />
            </div>
            <DialogFooter>
                <Button onClick={handleSaveTotalDebts} className="w-full h-12 rounded-2xl font-black bg-orange-600 hover:bg-orange-700">تحديث الديون</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
