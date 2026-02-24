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
  Hash,
  Calendar,
  History,
  Smartphone,
  Loader2,
  Globe,
  Mail,
  Phone as PhoneIcon,
  Clock,
  Zap,
  ShieldCheck,
  Search,
  Users
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type FastOffer = {
    num: string;
    price: number;
    title: string;
};

type Offer = {
    offerName: string;
    offerId: string;
    price: number;
    data?: string;
    sms?: string;
    minutes?: string;
    validity?: string;
    offertype: string; 
};

// --- STYLES ---
const WHY_PRIMARY = '#E30613'; // Red from Why logo
const WHY_GRADIENT = {
    backgroundColor: '#E30613',
    backgroundImage: `
        radial-gradient(at 0% 0%, #FF3B47 0px, transparent 50%),
        radial-gradient(at 100% 100%, #B3000A 0px, transparent 50%)
    `
};

// --- DATA DEFINITIONS ---

const WHY_FAST_OFFERS: FastOffer[] = [
    { num: '500', price: 500, title: 'شحن 500 ريال' },
    { num: '1000', price: 1000, title: 'شحن 1000 ريال' },
    { num: '2000', price: 2000, title: 'شحن 2000 ريال' },
    { num: '3000', price: 3000, title: 'شحن 3000 ريال' },
    { num: '5000', price: 5000, title: 'شحن 5000 ريال' },
];

const WHY_CATEGORIES = [
  {
    id: 'unified',
    title: 'باقات واي الموحدة',
    badge: 'Y',
    icon: Smartphone,
    offers: [
      { offerId: 'y_basic', offerName: 'باقة واي الأساسية', price: 1500, data: '1GB', minutes: '200', sms: '200', validity: 'شهر', offertype: 'Y_BASIC' },
      { offerId: 'y_plus', offerName: 'باقة واي بلس', price: 3000, data: '3GB', minutes: '500', sms: '500', validity: 'شهر', offertype: 'Y_PLUS' },
      { offerId: 'y_max', offerName: 'باقة واي ماكس', price: 5000, data: '7GB', minutes: '1000', sms: '1000', validity: 'شهر', offertype: 'Y_MAX' },
    ]
  }
];

// --- SUB-COMPONENTS ---

const PackageItemCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm relative border border-[#E30613]/10 mb-3 text-center cursor-pointer hover:bg-[#E30613]/5 transition-all active:scale-[0.98] group"
      onClick={onClick}
    >
      <h4 className="text-sm font-black text-[#E30613] mb-2 group-hover:text-[#E30613]/80 transition-colors">{offer.offerName}</h4>
      <div className="flex items-baseline justify-center mb-4">
        <span className="text-2xl font-black text-foreground">
            {offer.price.toLocaleString('en-US')}
        </span>
      </div>
      
      <div className="grid grid-cols-4 gap-2 pt-3 mt-2 border-t border-[#E30613]/10 text-center">
        <div className="space-y-1.5">
            <Globe className="w-5 h-5 mx-auto text-[#E30613]" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.data || '-'}</p>
        </div>
        <div className="space-y-1.5">
            <Mail className="w-5 h-5 mx-auto text-[#E30613]" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.sms || '-'}</p>
        </div>
        <div className="space-y-1.5">
            <PhoneIcon className="w-5 h-5 mx-auto text-[#E30613]" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.minutes || '-'}</p>
        </div>
        <div className="space-y-1.5">
            <Clock className="w-5 h-5 mx-auto text-[#E30613]" />
            <p className="text-[11px] font-black text-foreground truncate">{offer.validity || '-'}</p>
        </div>
      </div>
    </div>
);

const FastOfferCard = ({ offer, onClick }: { offer: FastOffer, onClick: () => void }) => (
    <div 
      className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-[#E30613]/10 mb-3 cursor-pointer hover:bg-[#E30613]/5 transition-all active:scale-[0.98] group flex items-center justify-between"
      onClick={onClick}
    >
      <div className="flex items-center gap-4 text-right">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[#E30613]/20 bg-white shrink-0">
              <Image src="https://i.postimg.cc/SN1vL3BC/images-(1).jpg" alt="WHY" fill className="object-cover" />
          </div>
          <div className="flex flex-col items-start">
              <h4 className="text-sm font-black text-foreground group-hover:text-[#E30613] transition-colors">{offer.title}</h4>
              <p className="text-[10px] font-bold text-muted-foreground">شحن فوري مباشر</p>
          </div>
      </div>

      <div className="flex items-baseline text-left shrink-0">
        <span className="text-xl font-black text-[#E30613]">{offer.price.toLocaleString('en-US')}</span>
      </div>
    </div>
);

export default function WhyServicesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const [phone, setPhone] = useState('');
    const [activeTab, setActiveTab] = useState("packages");
    const [isSearching, setIsSearching] = useState(false);
    const [billingInfo, setBillingInfo] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [selectedFastOffer, setSelectedFastOffer] = useState<FastOffer | null>(null);
    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [isConfirmingBalance, setIsConfirmingBalance] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isActivatingOffer, setIsActivatingOffer] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastTxDetails, setLastTxDetails] = useState<any>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const userDocRef = useMemoFirebase(
        () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    const handleSearch = useCallback(async () => {
        if (!phone || phone.length !== 9) return;
        
        if (!phone.startsWith('70')) {
            toast({ variant: 'destructive', title: 'رقم غير صحيح', description: 'رقم شركة واي يجب أن يبدأ بـ 70' });
            return;
        }

        setIsSearching(true);
        setBillingInfo(null);

        try {
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile: phone, action: 'query', service: 'why' }),
            });
            const result = await response.json();

            if (response.ok && (result.resultCode === "0" || result.resultCode === 0)) {
                setBillingInfo({ balance: parseFloat(result.balance || "0"), customer_type: 'واي (Y)' });
            } else {
                throw new Error(result.message || 'فشل الاستعلام من المزود.');
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'خطأ في الاستعلام', description: e.message });
        } finally {
            setIsSearching(false);
        }
    }, [phone, toast]);

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
                let selectedNumber = contacts[0].tel[0];
                selectedNumber = selectedNumber.replace(/[\s\-\(\)]/g, '');
                if (selectedNumber.startsWith('+967')) selectedNumber = selectedNumber.substring(4);
                if (selectedNumber.startsWith('00967')) selectedNumber = selectedNumber.substring(5);
                if (selectedNumber.startsWith('07')) selectedNumber = selectedNumber.substring(1);
                setPhone(selectedNumber.slice(0, 9));
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (phone.length === 9 && phone.startsWith('70')) {
            handleSearch();
        }
    }, [phone, handleSearch]);

    useEffect(() => {
        if (showSuccess && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed", e));
        }
    }, [showSuccess]);

    const handleProcessPayment = async (payAmount: number, typeLabel: string, numCode: string = '') => {
        if (!phone || !user || !userDocRef || !firestore) return;
        
        // فرض عمولة 5% إذا لم تكن موجودة
        const commission = Math.ceil(payAmount * 0.05);
        const totalToDeduct = payAmount + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية شاملة العمولة.' });
            return;
        }

        setIsProcessing(true);
        try {
            const transid = Date.now().toString().slice(-8);
            const apiPayload: any = {
                mobile: phone,
                action: 'bill',
                service: 'why',
                transid: transid,
                num: numCode || payAmount,
            };

            if (typeLabel === 'رصيد') {
                apiPayload.rasid = payAmount;
            }

            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload)
            });
            const result = await response.json();
            
            const isSuccess = result.resultCode === "0" || result.resultCode === 0;
            const isPending = result.resultCode === "-2" || result.resultCode === -2 || (result.resultDesc && result.resultDesc.toLowerCase().includes('under process'));

            if (!response.ok || (!isSuccess && !isPending)) {
                throw new Error(result.message || 'فشلت عملية السداد من المصدر.');
            }
            
            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid,
                transactionDate: new Date().toISOString(),
                amount: totalToDeduct,
                transactionType: `سداد واي ${typeLabel}`,
                notes: `إلى رقم: ${phone}. مبلغ: ${payAmount} + عمولة: ${commission}.`,
                recipientPhoneNumber: phone,
                transid: transid
            });
            await batch.commit();
            
            setLastTxDetails({ type: `سداد واي ${typeLabel}`, phone: phone, amount: totalToDeduct, transid: transid });
            setShowSuccess(true);
        } catch (error: any) {
            toast({ variant: "destructive", title: "فشل السداد", description: error.message });
        } finally {
            setIsProcessing(false);
            setIsConfirmingBalance(false);
            setSelectedFastOffer(null);
        }
    };

    const handleActivateOffer = async () => {
        if (!selectedOffer || !phone || !user || !userDocRef || !firestore) return;
        const basePrice = selectedOffer.price;
        const commission = Math.ceil(basePrice * 0.05);
        const totalToDeduct = basePrice + commission;

        if ((userProfile?.balance ?? 0) < totalToDeduct) {
            toast({ variant: 'destructive', title: 'رصيد غير كافٍ', description: 'رصيدك الحالي لا يكفي لتفعيل هذه الباقة شاملة العمولة.' });
            return;
        }

        setIsActivatingOffer(true);
        try {
            const transid = Date.now().toString().slice(-8);
            const response = await fetch('/api/telecom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mobile: phone, 
                    action: 'bill', 
                    service: 'why', 
                    num: selectedOffer.offertype, 
                    transid 
                })
            });
            const result = await response.json();
            
            const isSuccess = result.resultCode === "0" || result.resultCode === 0;
            const isPending = result.resultCode === "-2" || result.resultCode === -2 || (result.resultDesc && result.resultDesc.toLowerCase().includes('under process'));

            if (!response.ok || (!isSuccess && !isPending)) {
                throw new Error(result.message || 'فشل تفعيل الباقة من المصدر.');
            }

            const batch = writeBatch(firestore);
            batch.update(userDocRef, { balance: increment(-totalToDeduct) });
            batch.set(doc(firestoreCollection(firestore, 'users', user.uid, 'transactions')), {
                userId: user.uid, 
                transactionDate: new Date().toISOString(), 
                amount: totalToDeduct,
                transactionType: `تفعيل باقة واي: ${selectedOffer.offerName}`, 
                notes: `للرقم: ${phone}. الحالة: ${isPending ? 'قيد التنفيذ' : 'ناجحة'}`, 
                recipientPhoneNumber: phone,
                transid: transid
            });
            await batch.commit();
            
            setLastTxDetails({
                type: `تفعيل ${selectedOffer.offerName}`,
                phone: phone,
                amount: totalToDeduct,
                transid: transid
            });
            setShowSuccess(true);
            setSelectedOffer(null);
        } catch (e: any) {
            toast({ variant: "destructive", title: "خطأ", description: e.message });
        } finally {
            setIsActivatingOffer(false);
        }
    };

    if (isProcessing || isActivatingOffer) {
        return <ProcessingOverlay message="جاري تنفيذ طلبك..." />;
    }

    return (
        <div className="flex flex-col h-full bg-[#FDFDFD] dark:bg-slate-950">
            <SimpleHeader title="خدمات واي (Y)" />
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                <Card className="overflow-hidden rounded-[28px] shadow-lg border-none mb-4" style={WHY_GRADIENT}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="text-right text-white">
                            <p className="text-xs font-bold opacity-80 mb-1">الرصيد المتوفر</p>
                            <div className="flex items-baseline gap-1">
                                <h2 className="text-2xl font-black">
                                    {userProfile?.balance?.toLocaleString('en-US') || '0'}
                                </h2>
                                <span className="text-[10px] font-bold opacity-70 mr-1">ريال يمني</span>
                            </div>
                        </div>
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-[#E30613]/5">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">رقم الجوال</Label>
                        {isSearching && <Loader2 className="h-4 w-4 animate-spin text-[#E30613]" />}
                    </div>
                    <div className="relative">
                        <Input
                            type="tel"
                            placeholder="70xxxxxxx"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                            className="text-center font-bold text-lg h-12 rounded-2xl border-none bg-muted/20 focus-visible:ring-[#E30613] transition-all pr-12 pl-12"
                        />
                        <button 
                            onClick={handleContactPick}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-[#E30613] hover:bg-[#E30613]/10 rounded-xl transition-colors"
                            title="جهات الاتصال"
                        >
                            <Users className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {phone.length === 9 && phone.startsWith('70') && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                        {billingInfo && (
                            <div className="rounded-3xl overflow-hidden shadow-lg p-1 animate-in zoom-in-95" style={WHY_GRADIENT}>
                                <div className="bg-white/10 backdrop-blur-md rounded-[22px] grid grid-cols-2 text-center text-white">
                                    <div className="p-3 border-l border-white/10">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">رصيد الرقم</p>
                                        <p className="text-sm font-black">{billingInfo.balance.toLocaleString('en-US')} ريال</p>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-[10px] font-bold opacity-80 mb-1">نوع الخط</p>
                                        <p className="text-sm font-black">{billingInfo.customer_type}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Tabs defaultValue="packages" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl h-14 p-1.5 shadow-sm border border-[#E30613]/5">
                                <TabsTrigger value="packages" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#E30613] data-[state=active]:text-white">الباقات</TabsTrigger>
                                <TabsTrigger value="balance" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#E30613] data-[state=active]:text-white">رصيد</TabsTrigger>
                            </TabsList>

                            <TabsContent value="packages" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="mb-6">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">شحن رصيد فوري</h3>
                                    <div className="grid grid-cols-1 gap-1">
                                        {WHY_FAST_OFFERS.map((offer) => (
                                            <FastOfferCard key={offer.num} offer={offer} onClick={() => setSelectedFastOffer(offer)} />
                                        ))}
                                    </div>
                                </div>

                                <Accordion type="single" collapsible className="w-full space-y-3">
                                    {WHY_CATEGORIES.map((cat) => (
                                        <AccordionItem key={cat.id} value={cat.id} className="border-none">
                                            <AccordionTrigger className="px-4 py-4 rounded-2xl text-white hover:no-underline shadow-md group data-[state=open]:rounded-b-none" style={WHY_GRADIENT}>
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="bg-white text-[#E30613] font-black text-xs px-3 py-1 rounded-xl shadow-inner shrink-0">{cat.badge}</div>
                                                    <span className="text-sm font-black flex-1 mr-4 text-right">{cat.title}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 bg-white dark:bg-slate-900 border-x border-b border-[#E30613]/10 rounded-b-2xl shadow-sm">
                                                <div className="grid grid-cols-1 gap-3">
                                                    {cat.offers.map((o) => (
                                                        <PackageItemCard key={o.offerId} offer={o} onClick={() => setSelectedOffer(o)} />
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </TabsContent>

                            <TabsContent value="balance" className="pt-2 animate-in fade-in-0 duration-300">
                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-[#E30613]/5 text-center">
                                    <Label className="text-sm font-black text-muted-foreground block mb-4">ادخل المبلغ</Label>
                                    <div className="relative max-w-[240px] mx-auto">
                                        <Input 
                                            type="number" 
                                            placeholder="0.00" 
                                            value={amount} 
                                            onChange={(e) => setAmount(e.target.value)} 
                                            className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20 border-none text-[#E30613] placeholder:text-[#E30613]/10 focus-visible:ring-[#E30613]" 
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E30613]/30 font-black text-sm">ر.ي</div>
                                    </div>
                                    <Button 
                                        className="w-full h-14 rounded-2xl text-lg font-black mt-8 shadow-lg shadow-[#E30613]/20 text-white" 
                                        onClick={() => setIsConfirmingBalance(true)} 
                                        disabled={!amount}
                                        style={{ backgroundColor: WHY_PRIMARY }}
                                    >
                                        تسديد الآن
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            <Toaster />

            <AlertDialog open={isConfirmingBalance} onOpenChange={setIsConfirmingBalance}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد سداد رصيد</AlertDialogTitle>
                        <div className="space-y-3 pt-4 text-right text-sm">
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">رقم الهاتف:</span><span className="font-bold">{phone}</span></div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">المبلغ:</span><span className="font-bold">{parseFloat(amount || '0').toLocaleString('en-US')} ريال</span></div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">العمولة (5%):</span><span className="font-bold text-orange-600">{Math.ceil(parseFloat(amount || '0') * 0.05).toLocaleString('en-US')} ريال</span></div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2"><span className="font-black">إجمالي الخصم:</span><span className="font-black text-[#E30613] text-lg">{(parseFloat(amount || '0') + Math.ceil(parseFloat(amount || '0') * 0.05)).toLocaleString('en-US')} ريال</span></div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction className="w-full rounded-2xl h-12 font-bold text-white" onClick={() => handleProcessPayment(parseFloat(amount), 'رصيد')} style={{ backgroundColor: WHY_PRIMARY }}>تأكيد</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!selectedFastOffer} onOpenChange={() => setSelectedFastOffer(null)}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد الشحن الفوري</AlertDialogTitle>
                        <div className="py-4 space-y-3 text-right text-sm">
                            <p className="text-center text-lg font-black text-[#E30613] mb-2">{selectedFastOffer?.title}</p>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">رقم الجوال:</span><span className="font-bold">{phone}</span></div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">سعر الشحن:</span><span className="font-bold">{(selectedFastOffer?.price || 0).toLocaleString('en-US')} ريال</span></div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">العمولة (5%):</span><span className="font-bold text-orange-600">{Math.ceil((selectedFastOffer?.price || 0) * 0.05).toLocaleString('en-US')} ريال</span></div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2"><span className="font-black">إجمالي الخصم:</span><span className="font-black text-[#E30613] text-lg">{((selectedFastOffer?.price || 0) + Math.ceil((selectedFastOffer?.price || 0) * 0.05)).toLocaleString('en-US')} ريال</span></div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={() => selectedFastOffer && handleProcessPayment(selectedFastOffer.price, selectedFastOffer.title, selectedFastOffer.num)} className="w-full rounded-2xl h-12 font-bold text-white" style={{ backgroundColor: WHY_PRIMARY }}>تفعيل الآن</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
                <AlertDialogContent className="rounded-[32px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center font-black">تأكيد تفعيل الباقة</AlertDialogTitle>
                        <div className="py-4 space-y-3 text-right text-sm">
                            <p className="text-center text-lg font-black text-[#E30613] mb-2">{selectedOffer?.offerName}</p>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">رقم الجوال:</span><span className="font-bold">{phone}</span></div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">سعر الباقة:</span><span className="font-bold">{(selectedOffer?.price || 0).toLocaleString('en-US')} ريال</span></div>
                            <div className="flex justify-between items-center py-2 border-b border-dashed"><span className="text-muted-foreground">العمولة (5%):</span><span className="font-bold text-orange-600">{Math.ceil((selectedOffer?.price || 0) * 0.05).toLocaleString('en-US')} ريال</span></div>
                            <div className="flex justify-between items-center py-3 bg-muted/50 rounded-xl px-2 mt-2"><span className="font-black">إجمالي الخصم:</span><span className="font-black text-[#E30613] text-lg">{((selectedOffer?.price || 0) + Math.ceil((selectedOffer?.price || 0) * 0.05)).toLocaleString('en-US')} ريال</span></div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="grid grid-cols-2 gap-3 mt-6 sm:space-x-0">
                        <AlertDialogCancel className="w-full rounded-2xl h-12 mt-0">تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={handleActivateOffer} className="w-full rounded-2xl h-12 font-bold text-white" style={{ backgroundColor: WHY_PRIMARY }}>تفعيل الآن</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {showSuccess && lastTxDetails && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
                    <audio autoPlay src="https://cdn.pixabay.com/audio/2022/10/13/audio_a141b2c45e.mp3" />
                    <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] overflow-hidden border-none bg-card">
                        <div className="bg-green-500 p-8 flex justify-center"><div className="bg-white/20 p-4 rounded-full animate-bounce"><CheckCircle className="h-16 w-16 text-white" /></div></div>
                        <CardContent className="p-8 space-y-6">
                            <div><h2 className="text-2xl font-black text-green-600">تمت العملية بنجاح</h2><p className="text-sm text-muted-foreground mt-1">تم تنفيذ طلبك بنجاح</p></div>
                            <div className="w-full space-y-3 text-sm bg-muted/50 p-5 rounded-[24px] text-right border-2 border-dashed border-[#E30613]/10">
                                <div className="flex justify-between items-center border-b border-muted pb-2"><span className="text-muted-foreground flex items-center gap-2"><Hash className="w-3.5 h-3.5" /> رقم العملية:</span><span className="font-mono font-black text-[#E30613]">{lastTxDetails.transid}</span></div>
                                <div className="flex justify-between items-center border-b border-muted pb-2"><span className="text-muted-foreground flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> رقم الجوال:</span><span className="font-mono font-bold tracking-widest">{lastTxDetails.phone}</span></div>
                                <div className="flex justify-between items-center border-b border-muted pb-2"><span className="text-muted-foreground flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" /> النوع:</span><span className="font-bold">{lastTxDetails.type}</span></div>
                                <div className="flex justify-between items-center border-b border-muted pb-2"><span className="text-muted-foreground flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> المبلغ:</span><span className="font-black text-[#E30613]">{lastTxDetails.amount.toLocaleString('en-US')} ريال</span></div>
                                <div className="flex justify-between items-center pt-1"><span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> التاريخ:</span><span className="text-[10px] font-bold">{format(new Date(), 'Pp', { locale: ar })}</span></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="rounded-2xl h-12 font-bold" onClick={() => router.push('/login')}>الرئيسية</Button>
                                <Button className="rounded-2xl h-12 font-bold text-white" onClick={() => { setShowSuccess(false); handleSearch(); }} style={{ backgroundColor: WHY_PRIMARY }}>تحديث</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
