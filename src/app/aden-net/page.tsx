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
  Globe,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type QueryResult = {
    balance?: string;
    expireDate?: string;
    message?: string;
};

type Offer = {
    offerId: string;
    offerName: string;
    price: number;
    data: string;
    validity: string;
    num: string; 
};

const ADEN_NET_OFFERS: Offer[] = [
    { offerId: '20gb', offerName: 'عدن نت 20 جيجا', price: 3000, data: '20 GB', validity: 'شهر', num: '3000' },
    { offerId: '40gb', offerName: 'عدن نت 40 جيجا', price: 6000, data: '40 GB', validity: 'شهر', num: '6000' },
    { offerId: '60gb', offerName: 'عدن نت 60 جيجا', price: 9000, data: '60 GB', validity: 'شهر', num: '9000' },
    { offerId: '80gb', offerName: 'عدن نت 80 جيجا', price: 12000, data: '80 GB', validity: 'شهر', num: '12000' },
    { offerId: '120gb', offerName: 'عدن نت 120 جيجا (تجارية)', price: 30000, data: '120 GB', validity: 'شهر', num: '30000' },
];

const PackageCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-primary/5 mb-3 text-right cursor-pointer hover:bg-primary/5 transition-all active:scale-[0.98] group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
          <div className="bg-blue-600 text-white font-black text-[10px] px-2 py-1 rounded-lg uppercase">Aden Net</div>
          <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{offer.offerName}</h4>
      </div>
      
      <div className="flex items-baseline gap-1 justify-end mb-3">
        <span className="text-xl font-black text-primary">{offer.price.toLocaleString('en-US')}</span>
        <span className="text-[10px] font-bold text-muted-foreground">ريال</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/5">
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-1.5 rounded-xl text-center">
            <Globe className="w-3 h-3 text-primary" />
            <p className="text-[10px] font-bold">{offer.data}</p>
        </div>
        <div className="flex items-center justify-center gap-2 bg-muted/30 p-1.5 rounded-xl text-center">
            <Clock className="w-3 h-3 text-primary" />
            <p className="text-[10px] font-bold">{offer.validity}</p>
        </div>
      </div>
    </div>
);

export default function AdenNetPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [isActivatingOffer, setIsActivatingOffer] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
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

    useEffect(() => {
        if (phone.length !== 9 || !phone.startsWith('79')) {
            setQueryResult(null);
        }
    }, [phone]);

    const handleSearch = async () => {
        if (!phone || phone.length !== 9 || !phone.startsWith('79')) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'يرجى إدخال رقم عدن نت صحيح يبدأ بـ 79' });
            return;
        }
        setIsSearching(true);
        setQueryResult(null);
        try {
            const transid = Date.now().toString();
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    action: 'query', 
                    service: 'adenet',
                    num: '3000',
                    transid: transid
                })
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.message || 'فشل الاستعلام من المصدر.');
            
            setQueryResult({
                balance: result.balance || '...',
                expireDate: result.expireDate || '...',
                message: result.resultDesc
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: error.message });
        } finally {
            setIsSearching(false);
        }
    };

    const handleActivateOffer = async () => {
        if (!selectedOffer || !phone || !user || !userDocRef || !firestore) return;
        
        const basePrice = selectedOffer.price;
        const commission = Math.ceil(basePrice * 0.10);
        const totalToDeduct = basePrice + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك لا يكفي لتفعيل الباقة شاملة النسبة.' });
            return;
        }

        setIsActivatingOffer(true);
        try {
            const transid = Date.now().toString();
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    action: 'bill', 
                    service: 'adenet', 
                    num: selectedOffer.num,
                    transid: transid 
                })
            });
            const result = await response.json();
            
            const isSuccess = result.resultCode === "0" || result.resultCode === 0;
            if (!response.ok || !isSuccess) {
                throw new Error(result.message || result.resultDesc || 'فشل تفعيل الباقة من المصدر.');
            }

            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid, 
                transactionDate: new Date().toISOString(), 
                amount: totalToDeduct,
                transactionType: `تفعيل ${selectedOffer.offerName}`, 
                notes: `للرقم: ${phone}. تشمل النسبة: ${commission} ر.ي`, 
                recipientPhoneNumber: phone
            });
            await batch.commit();
            
            setShowSuccess(true);
            setSelectedOffer(null);
        } catch (e: any) {
            toast({ variant: "destructive", title: "خطأ", description: e.message });
        } finally {
            setIsActivatingOffer(false);
        }
    };

    if (isSearching) return <ProcessingOverlay message="جاري الاستعلام عن الرقم..." />;
    if (isActivatingOffer) return <ProcessingOverlay message="جاري تفعيل الباقة..." />;

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
                            <h2 className="text-2xl font-black text-green-600">تم تفعيل الباقة بنجاح</h2>
                            <p className="text-sm text-muted-foreground">تم تنفيذ طلبك للرقم {phone} بنجاح.</p>
                            <Button className="w-full h-14 rounded-2xl font-bold text-lg" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F4F7F9] dark:bg-slate-950">
            <SimpleHeader title="عدن نت" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                <Card className="overflow-hidden rounded-[28px] shadow-lg bg-mesh-gradient text-white border-none mb-4">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="text-right">
                            <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-2xl font-black text-white">{userProfile?.balance?.toLocaleString('en-US') || '0'}</h2>
                                <span className="text-[10px] font-bold opacity-70 text-white">ريال يمني</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-primary/5">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم عدن نت (يبدأ بـ 79)</Label>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Input
                            type="tel"
                            placeholder="79xxxxxxx"
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setPhone(val.slice(0, 9));
                            }}
                            className="text-center font-bold text-2xl h-14 rounded-2xl border-none bg-muted/20 focus-visible:ring-primary transition-all tracking-widest"
                        />
                        {phone.length === 9 && phone.startsWith('79') && (
                            <Button 
                                onClick={handleSearch} 
                                disabled={isSearching}
                                className="h-12 rounded-2xl font-bold animate-in slide-in-from-top-2 fade-in-0"
                            >
                                <Search className="w-5 h-5 ml-2" />
                                استعلام عن الرقم
                            </Button>
                        )}
                    </div>
                </div>

                {phone.length === 9 && phone.startsWith('79') && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                        {queryResult && (
                            <div className="bg-mesh-gradient rounded-3xl overflow-hidden shadow-lg p-1 animate-in zoom-in-95">
                                <div className="bg-white/10 backdrop-blur-md rounded-[22px] grid grid-cols-2 text-center text-white">
                                    <div className="p-3 border-l border-white/10">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">رصيد الحساب</p>
                                        <p className="text-sm font-black">{queryResult.balance}</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">تاريخ الانتهاء</p>
                                        <p className="text-sm font-black">{queryResult.expireDate}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-2 pb-10">
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 px-1">باقات عدن نت المتوفرة</h3>
                            <div className="grid grid-cols-1 gap-1">
                                {ADEN_NET_OFFERS.map((offer) => (
                                    <PackageCard 
                                        key={offer.offerId} 
                                        offer={offer} 
                                        onClick={() => setSelectedOffer(offer)} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Toaster />

            <AlertDialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد تفعيل باقة عدن نت</AlertDialogTitle>
                        <div className="py-4 space-y-3 text-right text-sm">
                            <p className="text-center text-lg font-black text-primary mb-2">{selectedOffer?.offerName}</p>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">رقم المشترك:</span>
                                <span className="font-bold">{phone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">سعر الباقة:</span>
                                <span className="font-bold">{selectedOffer?.price.toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                <span className="text-muted-foreground">النسبة (10%):</span>
                                <span className="font-bold text-orange-600">{Math.ceil((selectedOffer?.price || 0) * 0.10).toLocaleString('en-US')} ريال</span>
                            </div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2">
                                <span className="font-black">إجمالي الخصم:</span>
                                <span className="font-black text-primary text-lg">{((selectedOffer?.price || 0) + Math.ceil((selectedOffer?.price || 0) * 0.10)).toLocaleString('en-US')} ريال</span>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={handleActivateOffer} className="w-full rounded-2xl h-12 font-bold" disabled={isActivatingOffer}>
                            تفعيل الآن
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
