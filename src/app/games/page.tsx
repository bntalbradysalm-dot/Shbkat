'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Gamepad2, 
  CheckCircle, 
  Search,
  Wallet,
  Loader2,
  AlertCircle,
  X,
  CreditCard,
  User,
  Hash,
  Mail,
  Smartphone
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
import { cn } from '@/lib/utils';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type Game = {
    id: string;
    name: string;
    type: string;
    logo: string;
    fields: ('playerid' | 'playername' | 'zoneid' | 'email' | 'mobile' | 'uniqcode')[];
};

const GAMES: Game[] = [
    { id: 'pubg', name: 'PUBG Mobile', type: 'pubg', logo: 'https://i.postimg.cc/853VqsmZ/Screenshot-2023-12-14-10-35-02-62-6012fa4d4ddec268fc5c7112cbb265e7.jpg', fields: ['playerid', 'uniqcode'] },
    { id: 'freefire', name: 'Free Fire', type: 'freefire', logo: 'https://i.postimg.cc/3x7WLbRz/free-fire-cha7n.jpg', fields: ['playerid', 'uniqcode'] },
];

export default function GamesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [formData, setFormData] = useState<any>({
        playerid: '',
        playername: '',
        zoneid: '',
        email: '',
        mobile: '',
        uniqcode: '',
        amount: ''
    });
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
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

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handlePurchase = async () => {
        if (!selectedGame || !user || !userDocRef || !firestore) return;
        
        const price = parseFloat(formData.amount);
        if (isNaN(price) || price <= 0) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال مبلغ صحيح.' });
            return;
        }

        // إضافة عمولة 5%
        const commission = Math.ceil(price * 0.05);
        const totalToDeduct = price + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لإتمام العملية شاملة العمولة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const transid = Date.now().toString();
            
            // تجميع الحقول المطلوبة فقط
            const payload: any = {
                service: 'games',
                type: selectedGame.type,
                transid: transid
            };
            selectedGame.fields.forEach(f => {
                if (formData[f]) payload[f] = formData[f];
            });
            payload.mobile = formData.mobile || userProfile?.phoneNumber || '000';

            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || 'فشل عملية الشحن.');

            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid, 
                transactionDate: new Date().toISOString(), 
                amount: totalToDeduct,
                transactionType: `شحن ${selectedGame.name}`, 
                notes: `الكود: ${formData.uniqcode}. اللاعب: ${formData.playerid || formData.email}`, 
            });
            await batch.commit();
            
            setShowSuccess(true);
            setSelectedGame(null);
        } catch (e: any) {
            toast({ variant: "destructive", title: "خطأ", description: e.message });
        } finally {
            setIsProcessing(false);
        }
    };

    if (showSuccess) {
        return (
            <>
                <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" preload="auto" />
                <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                    <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none">
                        <div className="bg-green-500 p-8 flex justify-center">
                            <CheckCircle className="h-20 w-20 text-white" />
                        </div>
                        <CardContent className="p-8 space-y-6">
                            <h2 className="text-2xl font-black text-green-600">تم الشحن بنجاح</h2>
                            <p className="text-sm text-muted-foreground">تم تنفيذ طلبك بنجاح. سيتم إضافة الرصيد للعبة قريباً.</p>
                            <Button className="w-full h-14 rounded-2xl font-bold text-lg" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
            <SimpleHeader title="معرض الألعاب" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                <Card className="overflow-hidden rounded-[28px] shadow-lg bg-mesh-gradient text-white border-none mb-4">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="text-right">
                            <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-2xl font-black text-white">{userProfile?.balance?.toLocaleString('en-US') || '0'}</h2>
                                <span className="text-[10px] font-bold opacity-70 text-white">ريال</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    {GAMES.map((game) => (
                        <Card 
                            key={game.id} 
                            className="cursor-pointer hover:bg-primary/5 transition-all active:scale-95 border-none shadow-sm rounded-3xl overflow-hidden"
                            onClick={() => setSelectedGame(game)}
                        >
                            <div className="aspect-square relative">
                                <Image src={game.logo} alt={game.name} fill className="object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                    <p className="text-white text-xs font-black truncate">{game.name}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <Dialog open={!!selectedGame} onOpenChange={() => setSelectedGame(null)}>
                <DialogContent className="rounded-[32px] max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-center font-black">شحن {selectedGame?.name}</DialogTitle>
                        <DialogDescription className="text-center">أدخل بيانات الشحن المطلوبة للعملية</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {selectedGame?.fields.includes('playerid') && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold mr-1">رقم اللاعب (Player ID)</Label>
                                <Input 
                                    placeholder="12345678" 
                                    value={formData.playerid} 
                                    onChange={e => handleInputChange('playerid', e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        )}
                        {selectedGame?.fields.includes('zoneid') && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold mr-1">زون آيدي (Zone ID)</Label>
                                <Input 
                                    placeholder="1234" 
                                    value={formData.zoneid} 
                                    onChange={e => handleInputChange('zoneid', e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        )}
                        {selectedGame?.fields.includes('email') && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold mr-1">البريد الإلكتروني</Label>
                                <Input 
                                    type="email"
                                    placeholder="example@mail.com" 
                                    value={formData.email} 
                                    onChange={e => handleInputChange('email', e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        )}
                        {selectedGame?.fields.includes('uniqcode') && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold mr-1">كود الفئة الموحد (Uniqcode)</Label>
                                <Input 
                                    placeholder="PUBG_60" 
                                    value={formData.uniqcode} 
                                    onChange={e => handleInputChange('uniqcode', e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold mr-1 text-primary">المبلغ بالريال اليمني</Label>
                            <Input 
                                type="number"
                                placeholder="0.00" 
                                value={formData.amount} 
                                onChange={e => handleInputChange('amount', e.target.value)}
                                className="rounded-xl border-primary/30 font-bold"
                            />
                        </div>
                    </div>
                    <DialogFooter className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="rounded-2xl h-12" onClick={() => setSelectedGame(null)}>إلغاء</Button>
                        <Button className="rounded-2xl h-12 font-bold" onClick={handlePurchase} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="animate-spin" /> : 'شحن الآن'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Toaster />
        </div>
    );
}
