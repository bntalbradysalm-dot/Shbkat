'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  LayoutGrid,
  Phone,
  User,
  MapPin,
  Users,
  Wifi,
  CreditCard,
  BarChart3,
  Wallet,
  Megaphone,
  Send,
  Settings,
  Lock,
  Share2,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  SatelliteDish,
  ShoppingBag,
  PackageCheck,
  ListChecks,
  Banknote,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleHeader } from '@/components/layout/simple-header';
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
} from "@/components/ui/alert-dialog";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

const managementLinks = [
  { title: 'إدارة المستخدمين', icon: Users, href: '/users' },
  { title: 'إدارة الشبكات', icon: Wifi, href: '/networks-management' },
  { title: 'إدارة المتجر', icon: ShoppingBag, href: '/store-management' },
  { title: 'طلبات المتجر', icon: PackageCheck, href: '/store-orders' },
  { title: 'طلبات التجديد', icon: ListChecks, href: '/renewal-requests' },
  { title: 'طلبات السداد', icon: CreditCard, href: '/bill-payment-requests' },
  { title: 'طلبات السحب', icon: Banknote, href: '/withdrawal-requests' },
  { title: 'إدارة منظومة الوادي', icon: SatelliteDish, href: '/alwadi-management' },
  { title: 'تقارير منظومة الوادي', icon: BarChart3, href: '/alwadi-reports' },
  { title: 'إدارة طرق الدفع', icon: Wallet, href: '/payment-management' },
  { title: 'إدارة الإعلانات', icon: Megaphone, href: '/ads-management' },
  { title: 'إرسال إشعارات', icon: Send, href: '/send-notifications' },
  { title: 'إعدادات التطبيق', icon: Settings, href: '/app-settings' },
];

const userAppSettingsLinks = [
    { id: 'change-password', title: 'تغيير كلمة المرور', icon: Lock, href: '/change-password' },
    { id: 'share-app', title: 'شارك التطبيق', icon: Share2 },
    { id: 'help-center', title: 'مركز المساعدة', icon: HelpCircle, href: 'https://api.whatsapp.com/send?phone=' },
];


type UserProfile = {
  displayName?: string;
  location?: string;
  phoneNumber?: string;
  balance?: number;
  photoURL?: string;
};

type AppSettings = {
    appLink: string;
    supportPhoneNumber: string;
};

const CustomLoader = () => (
  <div className="bg-card/90 p-4 rounded-3xl shadow-2xl flex items-center justify-center w-24 h-24 animate-in zoom-in-95 border border-white/10">
    <div className="relative w-12 h-12">
      <svg
        viewBox="0 0 50 50"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        <path
          d="M15 25 A10 10 0 0 0 35 25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M40 15 A15 15 0 0 1 40 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-30"
        />
      </svg>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="fixed inset-0 flex flex-col justify-center items-center z-[100] bg-black/20 backdrop-blur-sm">
    <CustomLoader />
  </div>
);

export default function AccountPage() {
  const [activeTheme, setActiveTheme] = useState('light');
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'appSettings', 'global') : null),
    [firestore]
  );
  const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);
  
  const isUserAdmin = user?.email === '770326828@shabakat.com';

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setActiveTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setActiveTheme(theme);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  const handleShare = async () => {
    if (!appSettings?.appLink) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'رابط التطبيق غير محدد في الإعدادات.',
      });
      return;
    }
  
    window.open(appSettings.appLink, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = () => {
    if (auth) {
        auth.signOut();
        router.push('/');
    }
  };

  if (isUserLoading || !user) {
    return <LoadingSpinner />;
  }
  
  const helpCenterUrl = appSettings?.supportPhoneNumber 
    ? `https://api.whatsapp.com/send?phone=${appSettings.supportPhoneNumber}`
    : '#';

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="حسابي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="overflow-hidden rounded-[28px] shadow-lg bg-mesh-gradient text-white border-none">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex-grow text-right">
              <h2 className="text-lg font-black text-white">{userProfile?.displayName || 'مستخدم جديد'}</h2>
              <div className="text-xs text-white/80 mt-1.5 space-y-1.5">
                <div className="flex items-center justify-start gap-2">
                  <Phone className="h-3.5 w-3.5 opacity-70" />
                  <span className="font-bold text-white/90">{userProfile?.phoneNumber || '...'}</span>
                </div>
                <div className="flex items-center justify-start gap-2">
                  <MapPin className="h-3.5 w-3.5 opacity-70" />
                  <span className="font-bold text-white/90">{userProfile?.location ? `حضرموت - ${userProfile.location}` : '...'}</span>
                </div>
              </div>
            </div>
            <Avatar className="h-16 w-16 border-2 border-white/30 bg-white/10 shrink-0 shadow-xl">
                <AvatarImage src={userProfile?.photoURL} />
                <AvatarFallback>
                    <User className="h-8 w-8 text-white" />
                </AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>
        
        <div>
            <h3 className="text-xs font-black text-muted-foreground text-center mb-3 uppercase tracking-widest">الوضع المفضل</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl cursor-pointer transition-all w-full border-2 bg-card',
                  activeTheme === 'light'
                    ? 'border-primary text-primary shadow-md scale-[1.02]'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs font-bold">فاتح</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl cursor-pointer transition-all w-full border-2 bg-card',
                  activeTheme === 'dark'
                    ? 'border-primary text-primary shadow-md scale-[1.02]'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50'
                )}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs font-bold">داكن</span>
              </button>
            </div>
        </div>

        {isUserAdmin && (
          <>
            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black text-primary uppercase tracking-widest">
                  لوحة التحكم
                </h3>
              </div>

              <Card className="bg-card rounded-3xl border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {managementLinks.map((link, index) => {
                    const Icon = link.icon;
                    return (
                        <a
                        href={link.href}
                        key={link.title}
                        className={`group flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-muted/30 ${
                            index < managementLinks.length - 1 ? 'border-b border-muted' : ''
                        }`}
                        >
                        <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-primary" />
                            <span className="text-sm font-bold text-foreground">{link.title}</span>
                        </div>
                        <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                        </a>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <div className="pt-4 pb-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Card className="bg-card cursor-pointer rounded-2xl border-none shadow-sm hover:bg-destructive/5 transition-colors">
                  <CardContent className="p-0">
                      <div className="group flex items-center justify-center p-4 w-full">
                        <div className="flex items-center gap-3 text-destructive">
                            <LogOut className="h-5 w-5" />
                            <span className="text-sm font-black uppercase tracking-widest">تسجيل الخروج</span>
                        </div>
                      </div>
                  </CardContent>
              </Card>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[32px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-center font-black">هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  سيؤدي هذا الإجراء إلى تسجيل خروجك من التطبيق.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-3 pt-4">
                <AlertDialogCancel className="flex-1 rounded-2xl">إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="flex-1 rounded-2xl bg-destructive hover:bg-destructive/90">
                  تأكيد الخروج
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

      </div>
    </div>
    <Toaster />
    </>
  );
}
