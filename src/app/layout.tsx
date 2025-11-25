'use client';
import { useEffect, useState } from 'react';
import './globals.css';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleStorageChange = () => {
      const newTheme = localStorage.getItem('theme') || 'light';
      setTheme(newTheme);
       if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };

  }, []);

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
        <div className="mx-auto max-w-md bg-card min-h-screen flex flex-col shadow-2xl">
          <div className="flex-1 flex flex-col relative">
            <main className="flex-1 overflow-y-auto pb-20">
              {children}
            </main>
            <BottomNav />
          </div>
        </div>
      </body>
    </html>
  );
}
