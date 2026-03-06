'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  CheckCircle, 
  Search,
  Hash,
  Calendar,
  History,
  Globe,
  Users,
  Phone as PhoneIcon,
  Loader2,
  Info,
  Database,
  Tag,
  Home
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type QueryResult = {
    resultCode: string;
    balance: string; 
    dataRemaining: string; 
    expireDate?: string; 
    resultDesc?: string;
};

const HOUSE_THEME = {
    primary: '#4F46E5',
    gradient: {
        backgroundColor: '#4F46E5',
        backgroundImage: `radial-gradient(at 0% 0%, #6366F1 0px, transparent 50%), radial-gradient(at 100% 100%, #3730A3 0px, transparent 50%)`
    }
};

export default function HouseBalancePage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('');
    const [activeTab, setActiveTab] = useState("internet");
    const [isSearching, setIsSearching] = useState(false);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [amount, setAmount] = useState('');
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastTxDetails, setLastTxDetails] = useState<any>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const userDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    useEffect(() => {
        if (showSuccess && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }, [showSuccess]);

    const handleSearch = async () => {
        if (!phone || phone.length < 7) return;
        
        setIsSearching(true);
        setQueryResult(null);
        try {
            const transid = Date.now().toString().slice(-8);
            const serviceType = activeTab === 'internet' ? 'adsl' : 'line';
            
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    action: 'query', 
                    service: 'post', 
                    type: serviceType,
                    transid 
                })
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || 'فشل الاستعلام.');
            
            if (result.resultCode === "0" || result.resultCode === 0 || result.resultCode === "-2") {
                const bal = parseFloat(String(result.balance || "0"));
                const remainMB = parseFloat(String(result.remainAmount || "0"));
                
                setQueryResult({
                    resultCode: String(result.resultCode),
                    balance: bal.toLocaleString('en-US'),
                    dataRemaining: `GB ${(remainMB / 1024).toFixed(2)}`,
                    resultDesc: result.resultDesc
                });

                if (bal > 0) setAmount(String(bal));
            } else {
                throw new Error(result.resultDesc || 'رقم غير معروف.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ الاستعلام', description: error.message });
        } finally {
            setIsSearching(false);
        }
    };

    const handleContactPick = async () => {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            toast({ variant: "destructive", title: "غير مدعوم", description: "متصفحك لا يدعم الوصول لجهات الاتصال." });
            return;
        }
        try {
            const props = ['tel'];
            const opts = { multiple: false };
            const contacts = await (navigator as any).contacts.select(props, opts);
            if (contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
                let num = contacts[0].tel[0].replace(/\D/g, '').slice(-9);
                if (!num.startsWith('0')) num = '0' + num;
                setPhone(num.slice(0, 9));
            }
        } catch (err) { console.error(err); }
    };

    const handlePayment = async () => {
        if (!phone || !amount || !user || !userDocRef || !firestore) return;
        const val = parseFloat(amount);
        const commission = Math.ceil(val * 0.05);
        const total = val + commission;

        if ((userProfile?.balance ?? 0) < total) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي للسداد شامل العمولة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const transid = Date.now().toString().slice(-8);
            const type = activeTab === 'internet' ? 'adsl' : 'line';
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, amount: val, action: 'bill', service: 'post', type, transid 
                })
            });
            const result = await response.json();
            
            if (result.resultCode === "0" || result.resultCode === 0 || result.resultCode === "-2") {
                const batch = writeBatch(firestore);
                batch.update(userDocRef, { balance: increment(-total) });
                batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                    userId: user.uid,
                    transactionDate: new Date().toISOString(),
                    amount: total,
                    transactionType: `رصيد البيت (${activeTab === 'internet' ? 'إنترنت' : 'هاتف'})`,
                    notes: `للرقم: ${phone}. مبلغ: ${val} + عمولة: ${commission}.`,
                    recipientPhoneNumber: phone,
                    transid: transid
                });
                await batch.commit();
                
                setLastTxDetails({ type: 'رصيد البيت', phone, amount: total, transid });
                setShowSuccess(true);
            } else {
                throw new Error(result.message || 'فشل السداد.');
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "فشل العملية", description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirmingPayment(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
            {isSearching && <ProcessingOverlay message="جاري الاستعلام..." />}
            {isProcessing && <ProcessingOverlay message="جاري تنفيذ السداد..." />}

            <SimpleHeader title="رصيد البيت" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                <Card className="overflow-hidden rounded-[28px] shadow-lg text-white border-none mb-4" style={HOUSE_THEME.gradient}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="text-right">
                            <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                            <h2 className="text-2xl font-black text-white">{userProfile?.balance?.toLocaleString('en-US') || '0'} <span className="text-xs">ريال</span></h2>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl"><Wallet className="h-6 w-6 text-white" /></div>
                    </CardContent>
                </Card>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-primary/5">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-2 px-1">رقم الهاتف</Label>
                    <div className="relative">
                        <Input
                            type="tel"
                            placeholder="0xxxxxxx"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                            className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 focus-visible:ring-indigo-500 pr-12 pl-12"
                        />
                        <button onClick={handleContactPick} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-indigo-600"><Users className="h-5 w-5" /></button>
                    </div>
                    {phone.length >= 7 && (
                        <Button className="w-full h-12 rounded-2xl font-bold mt-4 bg-indigo-600 text-white" onClick={handleSearch} disabled={isSearching}>
                            {isSearching ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Search className="ml-2 h-4 w-4" />}
                            استعلام الآن
                        </Button>
                    )}
                </div>

                {phone.length >= 7 && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4">
                        <Tabs defaultValue="internet" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-indigo-100">
                                <TabsTrigger value="internet" className="rounded-xl font-bold text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white">الإنترنت</TabsTrigger>
                                <TabsTrigger value="landline" className="rounded-xl font-bold text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white">الهاتف</TabsTrigger>
                            </TabsList>

                            <TabsContent value="internet" className="pt-2 space-y-4">
                                {queryResult && activeTab === 'internet' && (
                                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-indigo-100 space-y-3">
                                        <div className="flex justify-between items-center py-2 border-b border-dashed border-indigo-100">
                                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Database className="w-3.5 h-3.5 text-indigo-600" /> الرصيد المتبقي:</span>
                                            <span className="text-sm font-black text-indigo-600">{queryResult.dataRemaining}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-indigo-600" /> المبلغ المطلوب:</span>
                                            <span className="text-sm font-black text-indigo-600">{queryResult.balance} ر.ي</span>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-indigo-100 text-center">
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">ادخل المبلغ المراد سداده</Label>
                                    <div className="relative max-w-[240px] mx-auto">
                                        <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none text-indigo-600" />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-sm">ر.ي</div>
                                    </div>
                                    <Button className="w-full h-14 rounded-2xl text-lg font-black mt-8 bg-indigo-600 text-white" onClick={() => setIsConfirmingPayment(true)} disabled={!amount}>تسديد الآن</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="landline" className="pt-2">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-indigo-100 text-center">
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">مبلغ سداد الهاتف</Label>
                                    <div className="relative max-w-[240px] mx-auto">
                                        <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none text-indigo-600" />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-sm">ر.ي</div>
                                    </div>
                                    <Button className="w-full h-14 rounded-2xl text-lg font-black mt-8 bg-indigo-600 text-white" onClick={() => setIsConfirmingPayment(true)} disabled={!amount}>تسديد الآن</Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            <AlertDialog open={isConfirmingPayment} onOpenChange={setIsConfirmingPayment}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد عملية السداد</AlertDialogTitle>
                        <div className="space-y-3 pt-4 text-right text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">الرقم:</span><span className="font-bold">{phone}</span></div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">المبلغ:</span><span className="font-bold">{amount} ريال</span></div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2"><span className="font-black">إجمالي الخصم (مع 5%):</span><span className="font-black text-indigo-600 text-lg">{(parseFloat(amount || '0') * 1.05).toLocaleString()} ريال</span></div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogAction className="w-full rounded-2xl h-12 font-bold bg-indigo-600 text-white" onClick={handlePayment}>تأكيد</AlertDialogAction>
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {showSuccess && lastTxDetails && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0">
                    <audio ref={audioRef} autoPlay src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" />
                    <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
                        <div className="bg-green-500 p-8 flex justify-center"><CheckCircle className="h-16 w-16 text-white animate-bounce" /></div>
                        <CardContent className="p-8 space-y-6">
                            <div><h2 className="text-2xl font-black text-green-600">تم السداد بنجاح</h2><p className="text-sm text-muted-foreground mt-1">وصل رصيدك للبيت بسلام!</p></div>
                            <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-indigo-100">
                                <div className="flex justify-between items-center border-b border-muted pb-2"><span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> العملية:</span><span className="font-mono font-black text-indigo-600">{lastTxDetails.transid}</span></div>
                                <div className="flex justify-between items-center border-b border-muted pb-2"><span className="text-muted-foreground flex items-center gap-2"><PhoneIcon className="w-3.5 h-3.5" /> الرقم:</span><span className="font-mono font-bold">{lastTxDetails.phone}</span></div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> الخصم:</span><span className="font-black text-indigo-600">{lastTxDetails.amount.toLocaleString()} ريال</span></div>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-bold bg-indigo-600 text-white" onClick={() => { setShowSuccess(false); router.push('/login'); }}>إغلاق</Button>
                        </CardContent>
                    </Card>
                </div>
            )}
            <Toaster />
        </div>
    );
}
