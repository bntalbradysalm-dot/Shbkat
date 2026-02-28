'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider } from '@/firebase';
import { useEffect, useState } from 'react';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { AppErrorDialog } from '@/components/layout/app-error-dialog';
import { SplashScreen } from '@/components/layout/splash-screen';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // قائمة الصفحات الرئيسية التي يجب أن يظهر فيها شريط التنقل
    const topLevelPages = [
      '/login', 
      '/renewal-requests', 
      '/users', 
      '/account', 
      '/store-orders', 
      '/bill-payment-requests', 
      '/withdrawal-requests'
    ];
    
    // يظهر الشريط فقط إذا كان المسار الحالي ضمن القائمة أعلاه
    setIsNavVisible(topLevelPages.includes(pathname));
  }, [pathname]);

  // التحقق من حالة شاشة الترحيب في جلسة التصفح
  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('has_seen_splash_v1');
    if (hasSeenSplash) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('has_seen_splash_v1', 'true');
  };

  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>Star Mobile - ستار موبايل</title>
        <meta name="description" content="تطبيق ستار موبايل لخدمات الاتصالات والإنترنت" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-background">
        <FirebaseProvider>
          <ThemeProvider>
            <div className="mx-auto max-w-md bg-card min-h-screen flex flex-col shadow-2xl relative">
              {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
              
              <div className="flex-1 flex flex-col relative">
                <WelcomeModal />
                <AppErrorDialog />
                <main className={`flex-1 overflow-y-auto ${isNavVisible ? 'pb-24' : ''}`}>
                  {children}
                </main>
                {isNavVisible && <BottomNav />}
              </div>
            </div>
          </ThemeProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
