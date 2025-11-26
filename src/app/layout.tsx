'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showBottomNav = pathname !== '/login' && pathname !== '/signup';

  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>Shabakat Wallet</title>
        <meta name="description" content="Your Digital Wallet" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <ThemeProvider>
          <div className="mx-auto max-w-md bg-card min-h-screen flex flex-col shadow-2xl">
            <div className="flex-1 flex flex-col relative">
              <main className={`flex-1 overflow-y-auto ${showBottomNav ? 'pb-20' : ''}`}>
                {children}
              </main>
              {showBottomNav && <BottomNav />}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
