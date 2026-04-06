'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useEffect, useState } from 'react';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { AppErrorDialog } from '@/components/layout/app-error-dialog';
import { SplashScreen } from '@/components/layout/splash-screen';
import { PinOverlay } from '@/components/layout/pin-overlay';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type UserProfile = {
  isPinEnabled?: boolean;
  pinCode?: string;
};

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isPinVerified, setIsPinVerified] = useState(false);

  // Fetch user profile for PIN check
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

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
    const hasSeenSplash = sessionStorage.getItem('has_seen_splash_v3');
    if (hasSeenSplash) {
      setShowSplash(false);
    }

    // التحقق من حالة الرمز السري في الجلسة الحالية
    const isVerified = sessionStorage.getItem('is_pin_verified');
    if (isVerified) {
        setIsPinVerified(true);
    }
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('has_seen_splash_v3', 'true');
  };

  const handlePinVerified = () => {
    setIsPinVerified(true);
    sessionStorage.setItem('is_pin_verified', 'true');
  };

  // Logic to determine if we should show the PIN lock
  const shouldShowPinLock = user && userProfile?.isPinEnabled && userProfile?.pinCode && !isPinVerified && !showSplash;

  return (
    <div className="mx-auto max-w-[450px] bg-card h-[100dvh] flex flex-col shadow-2xl relative overflow-hidden">
      {showSplash && (
        <SplashScreen 
          onComplete={handleSplashComplete} 
          isAppReady={!isUserLoading} 
        />
      )}

      {shouldShowPinLock && (
        <PinOverlay 
            userPin={userProfile.pinCode!} 
            onVerified={handlePinVerified} 
        />
      )}
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <WelcomeModal />
        <AppErrorDialog />
        <main className={cn("flex-1 flex flex-col min-h-0 relative")}>
          {children}
        </main>
        {isNavVisible && <BottomNav />}
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>Star Mobile - ستار موبايل</title>
        <meta name="description" content="تطبيق ستار موبايل لخدمات الاتصالات والإنترنت" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="icon" type="image/jpeg" sizes="32x32" href="https://i.postimg.cc/nzs88T1b/20260308-154520.jpg" />
        <link rel="icon" type="image/jpeg" sizes="16x16" href="https://i.postimg.cc/nzs88T1b/20260308-154520.jpg" />
        <link rel="apple-touch-icon" href="https://i.postimg.cc/nzs88T1b/20260308-154520.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-background">
        <FirebaseProvider>
          <ThemeProvider>
            <AppContent>
              {children}
            </AppContent>
          </ThemeProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}