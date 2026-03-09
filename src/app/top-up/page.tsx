'use client';

import React, { useState, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, MessageCircle, Wallet, Banknote, User as UserIcon, MapPin, Building2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

type PaymentMethod = {
  id: string;
  name: string;
  accountHolderName: string;
  accountNumber: string;
  logoUrl?: string;
};

type AppSettings = {
    supportPhoneNumber: string;
};

type UserProfile = {
    displayName?: string;
    phoneNumber?: string;
};

const getLogoSrc = (url?: string) => {
    if (url && (url.startsWith('http') || url.startsWith('/'))) {
      return url;
    }
    return 'https://placehold.co/100x100/e2e8f0/e2e8f0'; 
};

export default function TopUpPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useUser();
    
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [amount, setAmount] = useState('');

    const userDocRef = useMemoFirebase(
      () => (user ? doc(firestore, 'users', user.uid) : null),
      [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    const settingsDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'appSettings', 'global') : null),
        [firestore]
    );
    const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);
    
    const methodsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'paymentMethods') : null),
        [firestore]
    );
    const { data: paymentMethods, isLoading: isLoadingMethods } = useCollection<PaymentMethod>(methodsCollection);

    useEffect(() => {
        if (!selectedMethod && paymentMethods && paymentMethods.length > 0) {
            setSelectedMethod(paymentMethods[0]);
        }
    }, [paymentMethods, selectedMethod]);

    const handleCopy = (accountNumber: string) => {
        navigator.clipboard.writeText(accountNumber);
        toast({
            title: "تم النسخ",
            description: "تم نسخ رقم الحساب بنجاح.",
        });
    };

    const handleSendRequest = () => {
        if (!selectedMethod || !amount || !userProfile) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إكمال البيانات.' });
            return;
        }

        const phone = appSettings?.supportPhoneNumber;
        if (!phone) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'رقم الدعم غير متوفر حالياً.' });
            return;
        }

        const message = `*طلب إيداع رصيد جديد* 💰\n\n` +
            `👤 *اسم العميل:* ${userProfile.displayName || 'غير معروف'}\n` +
            `📱 *رقم الهاتف:* ${userProfile.phoneNumber || 'غير معروف'}\n` +
            `💵 *المبلغ:* ${Number(amount).toLocaleString('en-US')} ريال\n` +
            `🏦 *طريقة التحويل:* ${selectedMethod.name}\n\n` +
            `_الرجاء إرسال صورة الإيصال بعد هذه الرسالة لتأكيد العملية_`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const renderPaymentMethods = () => {
        if (isLoadingMethods) {
            return (
                <div className="grid grid-cols-2 gap-4 px-4">
                    {[...Array(2)].map((_, i) => (
                         <div key={i} className="flex flex-col items-center justify-center space-y-2 rounded-xl bg-card p-4 aspect-square border">
                            <Skeleton className="h-12 w-12 rounded-lg"/>
                            <Skeleton className="h-4 w-24"/>
                        </div>
                    ))}
                </div>
            );
        }

        if (!paymentMethods || paymentMethods.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center h-40 px-4">
                    <p className="mt-4 text-lg font-semibold">لا توجد طرق دفع متاحة</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 gap-4 px-4">
                {paymentMethods.map(method => (
                    <Card
                        key={method.id}
                        onClick={() => setSelectedMethod(method)}
                        className={cn(
                            "flex flex-col items-center justify-center space-y-2 rounded-xl p-4 aspect-square cursor-pointer transition-all border-2",
                            selectedMethod?.id === method.id 
                                ? 'border-primary shadow-lg bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                        )}
                    >
                        <Image 
                            src={getLogoSrc(method.logoUrl)} 
                            alt={method.name} 
                            width={48} 
                            height={48} 
                            className="rounded-lg object-contain" 
                        />
                        <p className="text-center text-xs font-semibold">{method.name}</p>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <SimpleHeader title="إيداع رصيد" />
            <div className="flex-1 overflow-y-auto space-y-6 pb-20">
                <div className="pt-4">
                    <div className="px-4">
                        <h2 className="text-lg font-bold">1. اختر طريقة التحويل</h2>
                        <p className="text-sm text-muted-foreground">حول المبلغ إلى أحد حساباتنا الظاهرة أدناه.</p>
                    </div>
                    <div className="mt-4">
                        {renderPaymentMethods()}
                    </div>
                </div>

                {selectedMethod && (
                    <div className="animate-in fade-in-0 duration-300 px-4">
                        <h2 className="text-lg font-bold">2. بيانات الحساب المختارة</h2>
                        <Card className="mt-4 border-primary/20">
                            <CardContent className="p-4 text-center space-y-3">
                                 <Image 
                                    src={getLogoSrc(selectedMethod.logoUrl)} 
                                    alt={selectedMethod.name} 
                                    width={56} 
                                    height={56} 
                                    className="rounded-xl object-contain mx-auto" 
                                />
                                <div>
                                    <p className="text-xs text-muted-foreground">اسم صاحب الحساب</p>
                                    <p className="text-lg font-bold">{selectedMethod.accountHolderName}</p>
                                </div>
                                <div className="flex items-center justify-center bg-muted p-2 rounded-lg gap-1 border border-primary/10">
                                    <Button variant="ghost" size="sm" onClick={() => handleCopy(selectedMethod.accountNumber)} className="text-primary font-bold">
                                        <Copy className="ml-1 h-3 w-3" />
                                        نسخ
                                    </Button>
                                    <p className="text-lg font-mono tracking-wider text-primary dark:text-primary-foreground">{selectedMethod.accountNumber}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                
                <div className="px-4 space-y-4">
                    <h2 className="text-lg font-bold">3. تأكيد عملية الإيداع</h2>
                    <Card className="shadow-md">
                        <CardContent className="p-4 space-y-4">
                            <div className='space-y-2'>
                                <Label htmlFor="amount" className="flex items-center gap-2 text-muted-foreground">
                                    <Wallet className="h-4 w-4 text-primary" />
                                    المبلغ الذي قمت بتحويله (بالريال)
                                </Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    inputMode='numeric'
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="text-right h-12 text-xl font-bold border-2 focus-visible:ring-primary"
                                />
                            </div>
                            <Button className="w-full h-14 text-lg font-bold shadow-lg" onClick={handleSendRequest} disabled={!amount || !selectedMethod}>
                                <MessageCircle className="ml-2 h-6 w-6" />
                                إرسال الإيصال عبر واتساب
                            </Button>
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                                    بعد الضغط على الزر، سيتم فتح محادثة الواتساب مع الإدارة. يرجى إرسال الرسالة التلقائية ثم إرفاق صورة الإيصال ليتم إضافة الرصيد لحسابك.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* الوكيل الرسمي Section */}
                <div className="px-4 pb-10 space-y-4">
                    <h2 className="text-lg font-black text-primary border-t pt-6 text-center">غذي حسابك عبر الوكيل الرسمي</h2>
                    <Card className="border-none shadow-xl bg-mesh-gradient text-white rounded-[32px] overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="relative w-24 h-24 mb-2 overflow-hidden rounded-2xl border-2 border-white/30 shadow-lg bg-white/10 backdrop-blur-md">
                                    <Image 
                                        src="https://i.postimg.cc/fLVNsBZx/967-770-326-828-20260218-132606.jpg"
                                        alt="Official Agent Logo"
                                        fill
                                        className="object-cover"
                                        data-ai-hint="company logo"
                                    />
                                </div>
                                <h3 className="text-xl font-black text-white">مكتب ستار ميديا للاعلان والتسويق</h3>
                                <div className="flex items-center gap-2 opacity-80">
                                    <MapPin className="h-4 w-4 text-white" />
                                    <p className="text-xs font-bold text-white">حضرموت - شبام - بجانب سوبر ماركت البر</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button 
                                    className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-black text-base shadow-lg"
                                    onClick={() => window.open('https://maps.app.goo.gl/Qs6cNBxMutA6SsvH6', '_blank')}
                                >
                                    <ExternalLink className="ml-2 h-5 w-5" />
                                    عرض الموقع على الخريطة
                                </Button>
                                <div className="bg-black/10 rounded-2xl p-4 text-center">
                                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1 text-white">ساعات العمل</p>
                                    <p className="text-base font-black leading-relaxed text-white">
                                        الفترة الصباحية: 8:00 صباحاً - 12:30 ظهراً<br/>
                                        الفترة المسائية: 4:00 عصراً - 9:00 مساءً
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Toaster />
        </div>
    );
}
