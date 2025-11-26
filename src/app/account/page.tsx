'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  ImageIcon,
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
import { useAuth, useUser } from '@/firebase';

const managementLinks = [
  { title: 'إدارة المستخدمين', icon: Users, href: '/users' },
  { title: 'إدارة الشبكات', icon: Wifi, href: '/networks-management' },
  { title: 'إدارة الكروت', icon: CreditCard, href: '/cards-management' },
  { title: 'إدارة منظومة الوادي', icon: SatelliteDish, href: '/alwadi-management' },
  { title: 'تقرير مبيعات الكروت', icon: BarChart3, href: '/sales-report' },
  { title: 'إدارة الدفع', icon: Wallet, href: '/payment-management' },
  { title: 'إدارة الإعلانات', icon: Megaphone, href: '/ads-management' },
  { title: 'إرسال إشعارات', icon: Send, href: '/send-notifications' },
];

const appSettingsLinks = [
    { title: 'إعدادات التطبيق', icon: Settings, href: '/app-settings' },
    { title: 'تغيير كلمة المرور', icon: Lock, href: '/change-password' },
    { title: 'شارك التطبيق', icon: Share2, href: '/share-app' },
    { title: 'مركز المساعدة', icon: HelpCircle, href: '/help-center' },
];

export default function AccountPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTheme, setActiveTheme] = useState('light');
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

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
      router.push('/login');
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


  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newImageUrl = URL.createObjectURL(file);
      localStorage.setItem('promoImageUrl', newImageUrl);
      window.dispatchEvent(new Event('storage')); 
    }
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (isUserLoading || !user) {
    return <div className="flex justify-center items-center h-screen">جاري التحميل...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="حسابي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="overflow-hidden shadow-lg bg-primary text-primary-foreground">
          <CardContent className="p-4 flex items-center gap-4">
            <User className="h-10 w-10 shrink-0 text-primary-foreground/80" />
            <div className="flex-grow">
              <h2 className="text-sm font-bold">{user.displayName || 'مستخدم جديد'}</h2>
              <div className="text-xs text-primary-foreground/80 mt-2 space-y-1">
                <div className="flex items-center">
                  <Phone className="ml-2 h-3 w-3" />
                  <span>{user.phoneNumber || 'لا يوجد رقم هاتف'}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="ml-2 h-3 w-3" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div>
            <h3 className="text-xs font-semibold text-muted-foreground text-center mb-2">الوضع المفضل</h3>
            <Card className="bg-card">
              <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-colors w-full ${
                      activeTheme === 'light'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-xs font-semibold">فاتح</span>
                  </button>
                  <button
                     onClick={() => handleThemeChange('dark')}
                     className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-colors w-full ${
                       activeTheme === 'dark'
                         ? 'bg-primary/10 text-primary'
                         : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                     }`}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-xs font-semibold">داكن</span>
                  </button>
                </div>
              </CardContent>
            </Card>
        </div>


        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground">
              لوحة التحكم
            </h3>
          </div>

          <Card className="bg-card">
            <CardContent className="p-0">
              {managementLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                    <a
                    href={link.href}
                    key={link.title}
                    className={`group flex items-center justify-between p-3 cursor-pointer ${
                        index < managementLinks.length - 1 ? 'border-b' : ''
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-semibold">{link.title}</span>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                    </a>
                )
              })}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <div className="flex items-center justify-center gap-2 mt-6 mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground">
              إعدادات الواجهة والتطبيق
            </h3>
          </div>
           <Card className="bg-card">
             <CardContent className="p-0">
                <button className="group flex items-center justify-between p-3 cursor-pointer border-b w-full" onClick={handleImageUploadClick}>
                   <div className="flex items-center gap-3">
                     <ImageIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                     <span className="text-xs font-semibold">تغيير الصورة الترويجية</span>
                   </div>
                   <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                />
                {appSettingsLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <a
                    href={link.href}
                    key={link.title}
                    className={`group flex items-center justify-between p-3 cursor-pointer ${
                        index < appSettingsLinks.length - 1 ? 'border-b' : ''
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs font-semibold">{link.title}</span>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                    </a>
                  )
                })}
             </CardContent>
           </Card>
        </div>

        <div className="pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Card className="bg-card cursor-pointer">
                  <CardContent className="p-0">
                      <button className="group flex items-center justify-center p-3 w-full">
                        <div className="flex items-center gap-3 text-destructive">
                            <LogOut className="h-5 w-5" />
                            <span className="text-xs font-semibold">تسجيل الخروج</span>
                        </div>
                      </button>
                  </CardContent>
              </Card>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد من تسجيل الخروج؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيؤدي هذا الإجراء إلى تسجيل خروجك من التطبيق. ستحتاج إلى تسجيل الدخول مرة أخرى للوصول إلى حسابك.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                  تأكيد
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

      </div>
    </div>
  );
}
