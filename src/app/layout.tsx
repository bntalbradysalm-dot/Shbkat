'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider } from '@/firebase';
import { useEffect, useState } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isNavVisible, setIsNavVisible] = useState(false);

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

  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>Shabakat Wallet</title>
        <meta name="description" content="Your Digital Wallet" />
        <link href="https://fonts.cdnfonts.com/css/ge-ss-two" rel="stylesheet" />
      </head>
      <body className="antialiased bg-background" style={{ fontFamily: "'GE SS Two', sans-serif" }}>
        <FirebaseProvider>
          <ThemeProvider>
            <div className="mx-auto max-w-md bg-card min-h-screen flex flex-col shadow-2xl">
              <div className="flex-1 flex flex-col relative">
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