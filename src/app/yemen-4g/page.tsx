
'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking, writeBatch } from '@/firebase';
import { doc, collection, increment } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Wifi, CheckCircle, Loader2, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

type PackageInfo = {
    packageName: string;
    data: string;
    price: number;
    validity: string;
    minutes: string;
    messages?: string;
};

type UserProfile = {
  balance?: number;
  displayName?: string;
  phoneNumber?: string;
};

const yemen4gPackages: PackageInfo[] = [
    { packageName: "باقة 15 جيجا", data: "15 GB", price: 2400, validity: "شهر", minutes: "اتصال مجاني داخل الشبكة" },
    { packageName: "باقة 25 جيجا", data: "25 GB", price: 4000, validity: "شهر", minutes: "اتصال مجاني داخل الشبكة + 50 دقيقة خارجها" },
    { packageName: "باقة 60 جيجا", data: "60 GB", price: 8000, validity: "شهر", minutes: "اتصال مجاني + 50 دقيقة" },
    { packageName: "باقة 130 جيجا", data: "130 GB", price: 16000, validity: "شهر", minutes: "اتصال مجاني 100 دقيقة اتصال" },
    { packageName: "باقة 250 جيجا", data: "250 GB", price: 26000, validity: "شهر", minutes: "اتصال مجاني + 100 خارجها" },
    { packageName: "باقة 500 جيجا", data: "500 GB", price: 46000, validity: "شهر", minutes: "اتصال مجاني + 50 خارجها" },
];

const PackageCard = ({ packageInfo, onPackageSelect }: { packageInfo: PackageInfo; onPackageSelect: (pkg: PackageInfo) => void; }) => {
    return (
        <Card onClick={() => onPackageSelect(packageInfo)} className="relative overflow-hidden rounded-xl bg-card shadow-md cursor-pointer hover:shadow-lg hover:border-primary transition-all duration-300">
            <CardContent className="p-4 text-center flex flex-col h-full">
                <h3 className="text-lg font-bold text-foreground">{packageInfo.packageName}</h3>
                <div className="my-2">
                    <p className="text-3xl font-bold text-primary dark:text-primary-foreground">
                        {packageInfo.price.toLocaleString('en-US')}
                    </p>
                     <p className="text-xs text-muted-foreground">ريال يمني</p>
                </div>
                <div className="mt-auto space-y-2 text-sm text-muted-foreground border-t pt-3">
                    <p className="flex items-center justify-center gap-2"><Wifi className="w-4 h-4 text-blue-500" /> {packageInfo.data}</p>
                    <p><Phone className="w-4 h-4 inline ml-1 text-green-500" />{packageInfo.minutes}</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default function Yemen4GPage() {
    const [targetPhoneNumber, setTargetPhoneNumber] = useState('');
    const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const userDocRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    const checkPhoneNumber = () => {
        if (targetPhoneNumber.length === 0) {
            toast({
                variant: 'destructive',
                title: 'رقم الهاتف مطلوب',
                description: 'الرجاء إدخال رقم يمن فورجي أولاً.',
            });
            return false;
        }
        return true;
    };

    const handlePackageSelect = (pkg: PackageInfo) => {
        if (!checkPhoneNumber()) return;
        setSelectedPackage(pkg);
        setIsConfirming(true);
    };

    const handleConfirmPurchase = async () => {
        if (!user || !userDocRef || !firestore || !selectedPackage || !userProfile?.displayName || !userProfile?.phoneNumber) return;
        
        const commission = selectedPackage.price * 0.10;
        const totalCost = selectedPackage.price + commission;

        if ((userProfile?.balance ?? 0) < totalCost) {
            toast({ variant: 'destructive', title: 'رصيد غير كاف', description: 'رصيدك الحالي لا يكفي لإتمام هذه العملية.' });
            setIsConfirming(false);
            return;
        }
        
        setIsProcessing(true);

        const requestData = {
            userId: user.uid,
            userName: userProfile.displayName,
            userPhoneNumber: userProfile.phoneNumber,
            targetPhoneNumber: targetPhoneNumber,
            packageTitle: selectedPackage.packageName,
            packagePrice: selectedPackage.price,
            commission: commission,
            totalCost: totalCost,
            status: 'pending',
            requestTimestamp: new Date().toISOString(),
        };

        const batch = writeBatch(firestore);

        // 1. Deduct total cost from user's balance
        batch.update(userDocRef, { balance: increment(-totalCost) });
        
        // 2. Create the yemen4g request document
        const requestsCollection = collection(firestore, 'yemen4gRequests');
        const requestDocRef = doc(requestsCollection);
        batch.set(requestDocRef, requestData);

        try {
            await batch.commit();
            setShowSuccess(true);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل إرسال طلب السداد.' });
        } finally {
            setIsProcessing(false);
            setIsConfirming(false);
        }
    };
    
    if (showSuccess) {
      return (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
          <Card className="w-full max-w-sm text-center shadow-2xl">
              <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center gap-4">
                      <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full">
                          <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 className="text-xl font-bold">تم إرسال طلبك بنجاح</h2>
                      <p className="text-sm text-muted-foreground">ستتم معالجة طلب سداد الباقة في أقرب وقت ممكن.</p>
                      <div className="w-full pt-4">
                          <Button variant="outline" className="w-full" onClick={() => router.push('/')}>العودة للرئيسية</Button>
                      </div>
                  </div>
              </CardContent>
          </Card>
        </div>
      );
    }

    return (
        <>
            <div className="flex flex-col min-h-screen bg-background text-foreground">
                <SimpleHeader title="باقات يمن 4G" />
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    <Card>
                        <CardContent className="p-4 space-y-2">
                           <Label htmlFor="targetPhone">رقم يمن 4G المراد تعبئته</Label>
                           <Input 
                                id="targetPhone" 
                                type="tel" 
                                placeholder="ادخل رقم الهاتف"
                                value={targetPhoneNumber}
                                onChange={(e) => setTargetPhoneNumber(e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-500/10 border-blue-500/20">
                      <CardContent className="p-3 text-center">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-2">
                          <Info className="w-5 h-5" />
                          سيتم إضافة عمولة 10% على سعر الباقة
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                        {yemen4gPackages.map((pkg, index) => (
                            <PackageCard key={index} packageInfo={pkg} onPackageSelect={handlePackageSelect} />
                        ))}
                    </div>
                </div>
            </div>
            <Toaster />

            <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
                {selectedPackage && (
                    <AlertDialogContent className="rounded-xl max-w-sm">
                        <AlertDialogHeader>
                            <AlertDialogTitle className='text-center'>تأكيد سداد الباقة</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription asChild>
                            <div className="pt-4 space-y-3 text-sm">
                                <p className='text-center text-muted-foreground pb-2'>سيتم خصم المبلغ الإجمالي من رصيدك لإتمام العملية.</p>
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="font-bold text-lg text-primary dark:text-primary-foreground">{selectedPackage.packageName}</p>
                                </div>
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="text-muted-foreground">رقم الهاتف</p>
                                    <p className="font-semibold font-mono text-lg">{targetPhoneNumber}</p>
                                </div>
                                <div className="bg-muted p-3 rounded-lg text-center space-y-1">
                                    <p className="flex justify-between"><span>سعر الباقة:</span> <span>{selectedPackage.price.toLocaleString('en-US')} ريال</span></p>
                                    <p className="flex justify-between"><span>العمولة (10%):</span> <span>{(selectedPackage.price * 0.10).toLocaleString('en-US')} ريال</span></p>
                                    <hr/>
                                    <p className="flex justify-between pt-1 font-bold text-destructive text-base"><span>الإجمالي:</span> <span>{(selectedPackage.price * 1.10).toLocaleString('en-US')} ريال</span></p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                        <AlertDialogFooter className="grid grid-cols-2 gap-3 pt-2">
                            <AlertDialogAction className='flex-1' onClick={handleConfirmPurchase} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد'}
                            </AlertDialogAction>
                            <AlertDialogCancel className='flex-1 mt-0' disabled={isProcessing}>إلغاء</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )}
            </AlertDialog>
        </>
    );
}

