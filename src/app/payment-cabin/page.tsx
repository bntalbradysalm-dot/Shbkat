'use client';

import React, { useState, useEffect } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Wifi, Building, RefreshCw, Smile, Clock, Mail, Globe, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
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


type ServiceProvider = 'yemen-mobile' | 'you' | 'saba-fon' | 'yemen-4g' | 'adsl' | 'landline' | 'unknown';

type PackageInfo = {
    packageName: string;
    paymentType: string;
    sliceType: string;
    price: string;
    validity: string;
    minutes: string;
    messages: string;
    data: string;
};

type SubscriptionInfo = {
    name: string;
    activationDate: string;
    expiryDate: string;
    packageDetails: PackageInfo;
}

const serviceConfig = {
  'yemen-mobile': {
    name: 'يمن موبايل',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '77',
    length: 9,
    color: 'bg-red-500',
    textColor: 'text-red-500',
    ringColor: 'focus-visible:ring-red-500',
    destructiveColor: 'bg-destructive hover:bg-destructive/90',
  },
   'you': {
    name: 'YOU',
    logo: 'https://i.postimg.cc/TPyC1Prn/YOU-2.png',
    prefix: '73',
    length: 9,
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    ringColor: 'focus-visible:ring-yellow-400',
    destructiveColor: 'bg-yellow-500 hover:bg-yellow-600',
  },
  'yemen-4g': {
    name: 'يمن 4G',
    logo: 'https://i.postimg.cc/yNZxB8js/unnamed-(1).png',
    prefix: '10',
    length: 9,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    ringColor: 'focus-visible:ring-blue-500',
    destructiveColor: 'bg-blue-500 hover:bg-blue-600',
  },
    'adsl': {
    name: 'ADSL',
    logo: 'https://i.postimg.cc/tCFs01p9/ADSL.png',
    prefix: '05',
    length: 8,
    color: 'bg-blue-800',
    textColor: 'text-blue-800',
    ringColor: 'focus-visible:ring-blue-800',
    destructiveColor: 'bg-blue-800 hover:bg-blue-900',
  },
  'landline': {
    name: 'الهاتف الثابت',
    logo: 'https://i.postimg.cc/q73b2z3W/landline.png',
    prefix: '',
    length: 7,
    color: 'bg-yellow-600',
    textColor: 'text-yellow-600',
    ringColor: 'focus-visible:ring-yellow-600',
    destructiveColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  'unknown': {
      name: 'غير معروف',
      logo: '',
      prefix: '',
      length: 9,
      color: 'bg-gray-400',
      textColor: 'text-gray-400',
      ringColor: 'focus-visible:ring-gray-400',
      destructiveColor: 'bg-gray-500 hover:bg-gray-600',
  }
};

const getProviderFromPhone = (phone: string): ServiceProvider => {
    if (phone.startsWith('77')) return 'yemen-mobile';
    if (phone.startsWith('73')) return 'you';
    if (phone.startsWith('10')) return 'yemen-4g';
    if (phone.startsWith('05') && phone.length <= 8) return 'adsl';
    // Add more rules here
    return 'unknown';
};

const predefinedAmounts = [2000, 1000, 500, 200, 100];

const PackageCard = ({
    packageInfo,
    onPackageSelect,
}: {
    packageInfo: PackageInfo;
    onPackageSelect: (pkg: PackageInfo) => void;
}) => {
    const { packageName, paymentType, sliceType, price, validity, minutes, messages, data } = packageInfo;
    return (
        <div onClick={() => onPackageSelect(packageInfo)}>
            <Card className="relative overflow-hidden rounded-xl bg-card shadow-md cursor-pointer hover:shadow-lg hover:border-border transition-shadow">
                <CardContent className="p-3 text-center">
                    <h3 className="text-sm font-bold text-foreground">{packageName}</h3>
                    <div className="mt-1 flex justify-center items-baseline gap-2 text-xs">
                        <span className="font-semibold text-muted-foreground">{paymentType}</span>
                    </div>
                    <p className="my-1.5 text-2xl font-bold text-red-500">
                        {price}
                    </p>
                </CardContent>
                <div className="grid grid-cols-4 divide-x-reverse divide-x border-t bg-muted/50 rtl:divide-x-reverse">
                    <div className="flex flex-col items-center justify-center p-1.5 text-center">
                        <Globe className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-xs font-semibold">{data}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 text-center">
                        <Mail className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-xs font-semibold">{messages}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 text-center">
                        <Phone className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-xs font-semibold">{minutes}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 text-center">
                        <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-xs font-semibold">{validity}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};

const SubscriptionCard = ({
    subscriptionInfo,
    onRenewSelect
}: {
    subscriptionInfo: SubscriptionInfo;
    onRenewSelect: (pkg: PackageInfo) => void;
}) => {
    return (
        <Card className="p-3 bg-card/80">
            <div className="flex items-center gap-3">
                <div className="flex-none">
                    <Button 
                        onClick={() => onRenewSelect(subscriptionInfo.packageDetails)}
                        className="bg-gradient-to-br from-red-500 to-red-400 text-white hover:opacity-90 w-16 h-16 flex flex-col items-center shadow-md">
                        <RefreshCw className="h-5 w-5" />
                        <span className="text-xs mt-1">تجديد</span>
                    </Button>
                </div>
                <div className="flex-grow text-sm">
                    <p className="font-bold">{subscriptionInfo.name}</p>
                    <div className="text-xs mt-1 text-muted-foreground">
                        <p className="text-green-600">الإشتراك: {subscriptionInfo.activationDate}</p>
                        <p className="text-red-500">الإنتهاء: {subscriptionInfo.expiryDate}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function PaymentCabinPage() {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [provider, setProvider] = useState<ServiceProvider>('unknown');
    const [activeTab, setActiveTab] = useState('رصيد');
    const [customAmount, setCustomAmount] = useState('');
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const { toast } = useToast();
    
    const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const currentMaxLength = provider !== 'unknown' ? serviceConfig[provider].length : 9;

    useEffect(() => {
        const detectedProvider = getProviderFromPhone(phoneNumber);
        setProvider(detectedProvider);
    }, [phoneNumber]);

    const checkPhoneNumber = () => {
        if (phoneNumber.length !== currentMaxLength) {
            toast({
                variant: 'destructive',
                title: 'رقم غير صحيح',
                description: `الرجاء إدخال رقم هاتف صحيح مكون من ${currentMaxLength} أرقام.`,
            });
            return false;
        }
        return true;
    };

    const handleAmountButtonClick = (amount: number) => {
        if (!checkPhoneNumber()) return;
        setSelectedAmount(amount);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomAmount(value);
        if (value !== '') {
            setSelectedAmount(null);
        }
    };
    
     const handlePackageSelect = (pkg: PackageInfo) => {
        if (!checkPhoneNumber()) return;
        setSelectedPackage(pkg);
        setIsConfirmOpen(true);
    };

    const handleSelectContact = async () => {
        if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
          try {
            const contacts = await (navigator as any).contacts.select(['tel'], { multiple: false });
            if (contacts.length > 0 && contacts[0].tel.length > 0) {
              let selectedPhone = contacts[0].tel[0];
              // Normalize phone number
              selectedPhone = selectedPhone.replace(/\s+/g, '').replace('+967', '');
              setPhoneNumber(selectedPhone);
            }
          } catch (ex) {
            toast({
              variant: 'destructive',
              title: 'خطأ',
              description: 'فشل اختيار جهة الاتصال.',
            });
          }
        } else {
          toast({
            title: 'غير مدعوم',
            description: 'متصفحك لا يدعم الوصول إلى جهات الاتصال.',
          });
        }
    };
    
    const finalAmount = selectedAmount !== null ? selectedAmount : (customAmount ? parseFloat(customAmount) : 0);
    
    const renderYemenMobilePackages = () => {
        const examplePackage: PackageInfo = {
            packageName: "باقة مزايا فورجي الاسبوعية",
            paymentType: "دفع مسبق",
            sliceType: "شريحة",
            price: "1500",
            validity: "7 أيام",
            minutes: "200",
            messages: "300",
            data: "2 GB",
        };

        const exampleSubscriptions: SubscriptionInfo[] = [
            {
                name: "تفعيل خدمة الانترنت - شريحة (3G)",
                activationDate: "09:54:37 2023-06-20",
                expiryDate: "00:00:00 2037-01-01",
                packageDetails: examplePackage // Using example package for renewal
            },
            {
                name: "مزايا الشهريه - 350 دقيقه 150 رساله 250 ميجا",
                activationDate: "20:42:53 2025-12-08",
                expiryDate: "23:59:59 2026-01-06",
                packageDetails: examplePackage // Using example package for renewal
            }
        ];

        return (
          <div className="space-y-4">
             <Card className="p-2">
              <div className="grid grid-cols-3 divide-x-reverse divide-x text-center rtl:divide-x-reverse">
                <div className="px-1">
                  <p className="text-xs font-bold text-red-500">رصيد الرقم</p>
                  <p className="font-bold text-sm text-foreground mt-1">77</p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-bold text-red-500">نوع الرقم</p>
                  <p className="font-bold text-xs text-foreground mt-1">3G | دفع مسبق</p>
                </div>
                <div className="px-1">
                  <p className="text-xs font-bold text-red-500 bg-red-100 rounded-md">فحص السلفة</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                     <Smile className="h-4 w-4 text-green-600" />
                     <p className="font-bold text-xs text-green-600">غير متسلف</p>
                  </div>
                </div>
              </div>
            </Card>
    
            <div className="bg-red-100/50 border border-red-200/50 rounded-xl p-3">
              <h3 className="text-center font-bold text-red-600 mb-3 bg-gradient-to-r from-red-500 to-red-400 text-white rounded-md py-1 shadow">الاشتراكات الحالية</h3>
              <div className="space-y-3">
                 {exampleSubscriptions.map((sub, index) => (
                    <SubscriptionCard key={index} subscriptionInfo={sub} onRenewSelect={handlePackageSelect} />
                 ))}
              </div>
            </div>
    
             <Accordion type="single" collapsible className="w-full space-y-3">
                <AccordionItem value="item-1" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-red-500 to-red-400 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات مزايا</span>
                             <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 text-sm font-bold">3G</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         <PackageCard packageInfo={examplePackage} onPackageSelect={handlePackageSelect} />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-red-500 to-red-400 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                         <div className="flex items-center justify-between w-full">
                            <span>باقات فورجي</span>
                             <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 text-sm font-bold">4G</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                        <PackageCard packageInfo={examplePackage} onPackageSelect={handlePackageSelect} />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-red-500 to-red-400 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات فولتي VOLTE</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 text-sm font-bold">4G</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         سيتم عرض باقات فولتي هنا قريباً.
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-4" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-red-500 to-red-400 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات الإنترنت الشهرية</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 text-sm font-bold">↑↓</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         سيتم عرض باقات الإنترنت الشهرية هنا قريباً.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5" className="border-0">
                    <AccordionTrigger className="bg-gradient-to-r from-red-500 to-red-400 text-white rounded-xl px-4 py-3 text-base font-bold hover:opacity-90 hover:no-underline [&[data-state=open]]:rounded-b-none shadow-lg">
                        <div className="flex items-center justify-between w-full">
                            <span>باقات الإنترنت 10 ايام</span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-500 text-xs font-bold p-0.5">10 MP</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-muted p-4 rounded-b-xl">
                         سيتم عرض باقات الإنترنت 10 ايام هنا قريباً.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SimpleHeader title="كبينة السداد" />
            <Toaster />
            
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
                <Card className={cn(
                    "rounded-2xl shadow-lg border-2 transition-colors duration-500",
                    provider !== 'unknown' ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
                )}>
                    <CardContent className="p-4 flex items-center gap-3">
                         {provider !== 'unknown' && (
                            <div className="p-1 bg-white rounded-lg shadow animate-in fade-in-0 zoom-in-75">
                                <Image
                                    src={serviceConfig[provider].logo}
                                    alt={serviceConfig[provider].name}
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                />
                            </div>
                        )}
                        <div className="relative flex-grow">
                             <Input
                                id="phone-number"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className={cn(
                                    "bg-transparent border-0 text-lg font-bold p-0 h-auto text-right focus-visible:ring-0 shadow-none focus-visible:ring-offset-0",
                                    provider !== 'unknown' ? serviceConfig[provider].ringColor : ''
                                )}
                                placeholder="أدخل رقم الجوال"
                                maxLength={currentMaxLength}
                            />
                        </div>
                         <button onClick={handleSelectContact} className="p-2 bg-white rounded-lg shadow-sm cursor-pointer">
                            <User className="h-5 w-5 text-muted-foreground" />
                         </button>
                    </CardContent>
                </Card>

                {provider === 'yemen-mobile' && (
                    <div className="space-y-4 animate-in fade-in-0 duration-500">
                        <div className="grid grid-cols-2 bg-muted p-1 rounded-xl">
                            {['رصيد', 'باقات'].map((tab) => (
                               <button 
                                key={tab} 
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "text-sm py-1.5 rounded-lg transition-colors font-semibold",
                                    activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                                )}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                         {activeTab === 'باقات' && renderYemenMobilePackages()}

                         {activeTab === 'رصيد' && (
                            <div className="space-y-4">
                                <Card className="rounded-2xl shadow-lg border-2 border-red-200/50 bg-red-50/50 text-center">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-red-500/80">الرصيد الحالي للإشتراك</p>
                                        <p className="text-3xl font-bold text-red-500 mt-1">0</p>
                                    </CardContent>
                                </Card>
                                
                                <div className="grid grid-cols-5 gap-2">
                                {predefinedAmounts.map(amount => (
                                    <Button 
                                            key={amount} 
                                            variant={selectedAmount === amount ? "default" : "outline"}
                                            onClick={() => handleAmountButtonClick(amount)}
                                            className={cn(
                                                "h-12 text-sm font-bold rounded-xl",
                                                selectedAmount === amount && `bg-red-500 hover:bg-red-500/90 border-red-500 text-white`
                                            )}
                                    >
                                        {amount}
                                    </Button>
                                ))}
                                </div>

                                <div>
                                    <Label htmlFor="customAmount" className="text-muted-foreground mb-1 block text-right">مبلغ</Label>
                                    <Input 
                                        id="customAmount"
                                        type="number" 
                                        placeholder="أدخل المبلغ"
                                        value={customAmount}
                                        onChange={handleCustomAmountChange}
                                        className="h-14 text-lg text-center"
                                    />
                                </div>
                            </div>
                        )}
                        
                    </div>
                )}
            </div>

            {provider === 'yemen-mobile' && activeTab === 'رصيد' && (
                <div className="p-4 bg-background border-t shadow-inner sticky bottom-0">
                    <Button 
                        onClick={() => {
                            if (!checkPhoneNumber()) return;
                            // Add payment logic here
                            toast({ title: 'جاري السداد...', description: `سيتم سداد مبلغ ${finalAmount.toLocaleString('en-US')} ريال.`})
                        }}
                        className={cn("w-full h-12 text-lg font-bold bg-gradient-to-b from-red-500 to-red-600 text-white", serviceConfig[provider]?.destructiveColor || 'bg-destructive')}
                        disabled={finalAmount <= 0}
                    >
                        سداد
                    </Button>
                </div>
            )}
             <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                {selectedPackage && (
                    <AlertDialogContent className="rounded-xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className='text-center'>تأكيد تفعيل الباقة</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription asChild>
                            <div className="pt-4 space-y-4 text-sm">
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="font-bold text-lg text-primary">{selectedPackage.packageName}</p>
                                    <p className="text-muted-foreground">للرقم: <span className="font-mono">{phoneNumber}</span></p>
                                </div>
                                <div className="bg-muted p-3 rounded-lg text-center">
                                    <p className="text-muted-foreground">المبلغ</p>
                                    <p className="font-bold text-2xl text-destructive">{Number(selectedPackage.price).toLocaleString('en-US')} ريال</p>
                                    <p className="text-muted-foreground text-xs mt-1">سيتم خصم المبلغ من رصيدك.</p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                        <AlertDialogFooter className="grid grid-cols-2 gap-2 pt-2">
                            <AlertDialogAction className='flex-1' onClick={() => {
                                // Add purchase logic here
                                setIsConfirmOpen(false);
                                toast({ title: "جاري تفعيل الباقة...", description: "سيتم إشعارك عند اكتمال العملية." });
                            }}>
                                تأكيد
                            </AlertDialogAction>
                            <AlertDialogCancel className='flex-1 mt-0'>إلغاء</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                )}
            </AlertDialog>
        </div>
    );
}
