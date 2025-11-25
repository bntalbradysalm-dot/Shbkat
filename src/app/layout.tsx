import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shabakat Wallet',
  description: 'Your Digital Wallet',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <div className="mx-auto max-w-md bg-card min-h-screen flex flex-col shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
