'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wallet, Phone, CheckCircle, Loader2, Globe, Mail, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, writeBatch, increment, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { ProcessingOverlay } from '@/components/layout/processing-overlay';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

type UserProfile = {
  balance?: number;
};

type BillingInfo = {
    balance: number;
    customer_type: string;
};

type Offer = {
    offerName: string;
    offerId: string;
    price: number;
    data?: string;
    sms?: string;
    minutes?: string;
    validity?: string;
};

const CATEGORIES = [
  {
    id: 'mazaya',
    title: 'باقات مزايا',
    badge: '3G',
    offers: [
      { offerId: 'm1200', offerName: 'مزايا الشهرية 1200', price: 1200, data: '250 ميجا', sms: '150 رسالة', minutes: '300 دقيقة', validity: '30 يوم' },
      { offerId: 'm2500', offerName: 'مزايا الشهرية 2500', price: 2500, data: '1 جيجا', sms: '300 رسالة', minutes: '600 دقيقة', validity: '30 يوم' },
      { offerId: 'm5000', offerName: 'مزايا الشهرية 5000', price: 5000, data: '2.5 جيجا', sms: '600 رسالة', minutes: '1200 دقيقة', validity: '30 يوم' },
    ]
  },
  {
    id: '4g',
    title: 'باقات فورجي',
    badge: '4G',
    offers: [
      { offerId: '4g_5gb', offerName: 'فورجي 5 جيجابايت', price: 2400, data: '5 جيجا', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم' },
      { offerId: '4g_10gb', offerName: 'فورجي 10 جيجابايت', price: 4400, data: '10 جيجا', sms: 'بلا حدود', minutes: 'بلا حدود', validity: '30 يوم' },
    ]
  },
];

const PackageCard = ({ offer, onClick }: { offer: Offer, onClick: () => void }) => (
    <div 
      className="bg-[#FDE6D2] rounded-[20px] p-4 shadow-sm relative border border-[#EBCDB5] mb-3 text-right cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute top-3 left-3 w-8 h-8 rounded-full overflow-hidden opacity-80">
        <Image src="https://i.postimg.cc/tTXzYWY3/1200x630wa.jpg" alt="YM" fill className="object-cover" />
      </div>
      <h4 className="text-lg font-black text-[#8B1D3D]">{offer.offerName}</h4>
      <div className="flex justify-center my-2"><span className="text-2xl font-black text-[#8B1D3D]">{offer.price}</span></div>
      <div className="grid grid-cols-4 gap-1 pt-3 border-t border-[#EBCDB5] text-center">
        <div><Globe className="w-4 h-4 mx-auto text-[#8B1D3D]" /><p className="text-[10px] font-bold">{offer.data || '-'}</p></div>
        <div><Mail className="w-4 h-4 mx-auto text-[#8B1D3D]" /><p className="text-[10px] font-bold">{offer.sms || '-'}</p></div>
        <div><Phone className="w-4 h-4 mx-auto text-[#8B1D3D]" /><p className="text-[10px] font-bold">{offer.minutes || '-'}</p></div>
        <div><Clock className="w-4 h-4 mx-auto text-[#8B1D3D]" /><p className="text-[10px] font-bold">{offer.validity || '-'}</p></div>
      </div>
    </div>
);

export default function YemenMobilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState("balance");
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [amount, setAmount] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const userDocRef = useMemoFirebase(() => (user && firestore ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    if (phone.length === 9) {
      handleSearch();
    }
  }, [phone]);

  const handleSearch = async () => {
    try {
      const response = await fetch('/api/telecom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, action: 'query' }),
      });
      const result = await response.json();
      if (response.ok) {
          setBillingInfo({ balance: parseFloat(result.balance || "0"), customer_type: result.mobileTy || 'دفع مسبق' });
      }
    } catch (e) {}
  };

  const handlePayment = async () => {
    if (!phone || !amount || !user || !userDocRef) return;
    const val = parseFloat(amount);
    if ((userProfile?.balance ?? 0) < val) {
        toast({ variant: 'destructive', title: 'رصيد غير كافٍ' });
        return;
    }
    setIsProcessing(true);
    try {
        const batch = writeBatch(firestore!);
        batch.update(userDocRef, { balance: increment(-val) });
        batch.set(doc(firestoreCollection(firestore!, 'users', user.uid, 'transactions')), {
            userId: user.uid, transactionDate: new Date().toISOString(), amount: val,
            transactionType: 'سداد يمن موبايل', notes: `إلى رقم: ${phone}`, recipientPhoneNumber: phone
        });
        await batch.commit();
        setShowSuccess(true);
    } catch (e) {
        toast({ variant: "destructive", title: "فشل السداد" });
    } finally {
        setIsProcessing(false);
        setIsConfirming(false);
    }
  };

  if (isProcessing) return <ProcessingOverlay message="جاري السداد..." />;
  
  if (showSuccess) {
    return (
        <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl rounded-[40px] p-8">
                <div className="flex flex-col items-center gap-6">
                    <div className="bg-green-100 p-5 rounded-full"><CheckCircle className="h-16 w-16 text-green-600" /></div>
                    <h2 className="text-2xl font-black">تم السداد بنجاح</h2>
                    <Button className="w-full h-12 rounded-2xl font-bold" onClick={() => router.push('/login')}>العودة للرئيسية</Button>
                </div>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <SimpleHeader title="يمن موبايل" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="shadow-lg border-none rounded-[32px] p-6 bg-white space-y-6">
            <div className='space-y-2'>
              <Label className="text-xs font-bold text-muted-foreground text-right block">رقم الهاتف</Label>
              <Input
                type="tel"
                placeholder="77xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                className="text-center font-black text-4xl h-16 rounded-2xl border-2 bg-muted/30"
              />
            </div>
            
            {phone.length === 9 && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-2xl h-12">
                         <TabsTrigger value="packages" className="rounded-xl font-bold">الباقات</TabsTrigger>
                         <TabsTrigger value="balance" className="rounded-xl font-bold">الرصيد</TabsTrigger>
                    </TabsList>
                    <TabsContent value="packages" className="pt-6">
                        <Accordion type="single" collapsible className="w-full space-y-4">
                          {CATEGORIES.map((cat) => (
                            <AccordionItem key={cat.id} value={cat.id} className="border-none">
                              <AccordionTrigger className="px-5 py-4 bg-primary rounded-2xl text-white hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <span className="bg-white text-primary px-2 py-1 rounded-md text-xs font-black">{cat.badge}</span>
                                    <span className="text-sm font-bold">{cat.title}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="p-4 bg-white border rounded-b-2xl">
                                {cat.offers.map((o) => (
                                  <PackageCard key={o.offerId} offer={o} onClick={() => { setSelectedOffer(o); }} />
                                ))}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                    </TabsContent>
                    <TabsContent value="balance" className="pt-6 space-y-6">
                        <div className='space-y-4'>
                            <Label className="text-xs font-bold text-muted-foreground text-right block">المبلغ</Label>
                            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-center font-black text-3xl h-16 rounded-2xl bg-muted/20" />
                        </div>
                        <Button className="w-full h-14 rounded-2xl text-lg font-black" onClick={() => setIsConfirming(true)} disabled={!amount}>تأكيد السداد</Button>
                    </TabsContent>
                </Tabs>
            )}
        </Card>
      </div>
      <Toaster />
      <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
        <AlertDialogContent className="rounded-[32px]">
            <AlertDialogHeader><AlertDialogTitle className="text-center">تأكيد سداد رصيد</AlertDialogTitle></AlertDialogHeader>
            <div className="py-4 text-center">
                <p>سداد مبلغ <span className="font-black text-primary">{amount} ريال</span> للرقم <span className="font-black">{phone}</span></p>
            </div>
            <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="flex-1">إلغاء</AlertDialogCancel>
                <AlertDialogAction className="flex-1" onClick={handlePayment}>تأكيد</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {selectedOffer && (
          <AlertDialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
              <AlertDialogContent className="rounded-[32px]">
                  <AlertDialogHeader><AlertDialogTitle className="text-center">تأكيد تفعيل باقة</AlertDialogTitle></AlertDialogHeader>
                  <div className="py-4 text-center">
                      <p className="font-bold text-primary">{selectedOffer.offerName}</p>
                      <p>للرقم: {phone}</p>
                  </div>
                  <AlertDialogFooter className="flex-row gap-2">
                      <AlertDialogCancel className="flex-1">تراجع</AlertDialogCancel>
                      <AlertDialogAction className="flex-1" onClick={() => { setSelectedOffer(null); toast({ title: "جاري المعالجة" }); }}>تفعيل</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}
    </div>
  );
}
