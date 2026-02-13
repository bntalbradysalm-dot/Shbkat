'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Wallet, 
  Loader2, 
  User,
  Gamepad2,
  Zap,
  ShieldCheck,
  Star,
  AlertCircle,
  Hash,
  Calendar,
  History
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import Image from 'next/image';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

type UCPrice = {
    amount: string;
    price: number;
    code: string;
};

const UC_PACKAGES: UCPrice[] = [
    { amount: '60 شدة', price: 1800, code: '60' },
    { amount: '325 شدة', price: 8000, code: '325' },
    { amount: '385 شدة', price: 9000, code: '385' },
    { amount: '660 شدة', price: 15000, code: '660' },
    { amount: '720 شدة', price: 17500, code: '720' },
    { amount: '1800 شدة', price: 39000, code: '1800' },
];

export default function GamesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [selectedPackage, setSelectedPackage] = useState<UCPrice | null>(null);
    const [playerId, setPlayerId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastTransid, setLastTransid] = useState('');
    const [lastTotalAmount, setLastTotalAmount] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const userDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc<any>(userDocRef);

    useEffect(() => {
        if (showSuccess && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }, [showSuccess]);

    const handlePurchase = async () => {
        if (!selectedPackage || !playerId || !user || !userDocRef || !firestore) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم اللاعب.' });
            return;
        }

        const basePrice = selectedPackage.price;
        const commission = Math.ceil(basePrice * 0.05);
        const totalToDeduct = basePrice + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام العملية شاملة العمولة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const transid = Date.now().toString().slice(-8);
            setLastTransid(transid);
            setLastTotalAmount(totalToDeduct);
            
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    service: 'games',
                    type: 'pubg',
                    uniqcode: selectedPackage.code,
                    playerid: playerId,
                    mobile: userProfile?.phoneNumber || '000',
                    transid: transid 
                })
            });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || result.resultDesc || 'فشل تنفيذ الطلب من المصدر.');
            }

            const isSuccess = result.resultCode === "0" || result.resultCode === 0;
            const isPending = result.resultCode === "-2" || result.resultCode === -2;

            if (!isSuccess && !isPending) {
                throw new Error(result.resultDesc || 'تم رفض العملية من قبل مزود الخدمة.');
            }

            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid, 
                transactionDate: new Date().toISOString(), 
                amount: totalToDeduct,
                transactionType: `شحن شدات: ${selectedPackage.amount}`, 
                notes: `رقم اللاعب: ${playerId}. الحالة: ${isPending ? 'قيد التنفيذ' : 'ناجحة'}`, 
                recipientPhoneNumber: playerId,
                transid: transid
            });
            await batch.commit();
            
            setShowSuccess(true);
        } catch (e: any) {
            toast({ 
                variant: "destructive", 
                title: "فشل في عملية الشحن", 
                description: e.message 
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) return <ProcessingOverlay message="جاري معالجة طلبك..." />;

    if (showSuccess) {
        return (
            <>
                <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                    <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
                        <div className="bg-green-500 p-8 flex justify-center">
                            <div className="bg-white/20 p-4 rounded-full animate-bounce">
                                <CheckCircle className="h-16 w-16 text-white" />
                            </div>
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <div>
                                <h2 className="text-2xl font-black text-green-600">تم الشحن بنجاح</h2>
                                <p className="text-sm text-muted-foreground mt-1">وصلت الشدات لحساب اللاعب</p>
                            </div>

                            <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-primary/10">
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم العملية:</span>
                                    <span className="font-mono font-black text-primary">{lastTransid}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> فئة الشحن:</span>
                                    <span className="font-bold">{selectedPackage?.amount}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><User className="w-3.5 h-3.5" /> رقم اللاعب (ID):</span>
                                    <span className="font-mono font-bold tracking-widest">{playerId}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-muted pb-2">
                                    <span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> الإجمالي المخصوم:</span>
                                    <span className="font-black text-primary">{lastTotalAmount.toLocaleString('en-US')} ريال</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> التاريخ:</span>
                                    <span className="text-[10px] font-bold">{format(new Date(), 'Pp', { locale: ar })}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => router.push('/login')}>الرئيسية</Button>
                                <Button className="rounded-2xl h-12 font-bold" onClick={() => router.push('/transactions')}>
                                    <History className="ml-2 h-4 w-4" /> العمليات
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
            <SimpleHeader title="شدات ببجي" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Banner */}
                <div className="relative w-full aspect-[21/9] rounded-[28px] overflow-hidden shadow-lg border border-primary/10 mb-2 animate-in fade-in-0 zoom-in-95 duration-500">
                    <Image 
                        src="https://i.postimg.cc/K8pPdgWg/112750758-whatsubject.jpg" 
                        alt="PUBG Mobile Banner" 
                        fill 
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-4">
                        <h3 className="text-white font-black text-lg">ببجي موبايل - PUBG Mobile</h3>
                        <p className="text-white/70 text-[10px] font-bold">اشحن شداتك الآن بأفضل الأسعار وأسرع سداد</p>
                    </div>
                </div>

                <div className="space-y-3 pb-10">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">اختر فئة الشحن</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {UC_PACKAGES.map((pkg) => (
                            <Card 
                                key={pkg.code} 
                                className="cursor-pointer hover:bg-primary/5 transition-all active:scale-[0.98] border-none shadow-sm rounded-3xl overflow-hidden group"
                                onClick={() => setSelectedPackage(pkg)}
                            >
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-2xl group-hover:bg-orange-200 transition-colors">
                                            <Star className="w-6 h-6 text-orange-500 fill-orange-500" />
                                        </div>
                                        <div className="text-right">
                                            <h4 className="font-black text-sm text-foreground">{pkg.amount}</h4>
                                            <p className="text-[10px] font-bold text-muted-foreground">شحن مباشر</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-baseline gap-1 justify-end">
                                            <span className="text-lg font-black text-primary">{pkg.price.toLocaleString('en-US')}</span>
                                        </div>
                                        <Button size="sm" className="h-7 rounded-lg text-[10px] font-black px-4 mt-1">شراء</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedPackage && !showSuccess} onOpenChange={() => setSelectedPackage(null)}>
                <DialogContent className="rounded-[32px] max-w-sm">
                    <DialogHeader>
                        <div className="bg-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Star className="text-orange-500 fill-orange-500 h-6 w-6" />
                        </div>
                        <DialogTitle className="text-center font-black">تأكيد شحن {selectedPackage?.amount}</DialogTitle>
                        <DialogDescription className="text-center">أدخل رقم اللاعب (Player ID) لإتمام العملية</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="playerid" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-1">رقم اللاعب (Player ID)</Label>
                            <Input 
                                id="playerid"
                                placeholder="" 
                                type="tel"
                                value={playerId} 
                                onChange={e => setPlayerId(e.target.value.replace(/\D/g, ''))}
                                className="rounded-2xl h-14 text-center text-2xl font-black border-2 focus-visible:ring-primary tracking-widest"
                            />
                        </div>

                        <div className="bg-muted/50 p-4 rounded-[24px] space-y-2 text-sm">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-bold">سعر الشحن:</span>
                                <span className="font-black">{selectedPackage?.price.toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-bold">العمولة (5%):</span>
                                <span className="font-black text-orange-600">{Math.ceil((selectedPackage?.price || 0) * 0.05).toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="pt-2 border-t border-dashed flex justify-between items-center">
                                <span className="font-black text-foreground">الإجمالي:</span>
                                <span className="font-black text-primary text-lg">
                                    {((selectedPackage?.price || 0) + Math.ceil((selectedPackage?.price || 0) * 0.05)).toLocaleString('en-US')} ريال
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => setSelectedPackage(null)}>إلغاء</Button>
                        <Button className="rounded-2xl h-12 font-black shadow-lg shadow-primary/20" onClick={handlePurchase} disabled={isProcessing || !playerId}>
                            {isProcessing ? <Loader2 className="animate-spin" /> : 'شحن الآن'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Toaster />
        </div>
    );
}
