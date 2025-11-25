'use client';
import { Bell, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SimpleHeaderProps = {
  title: string;
};

const SimpleHeader = ({ title }: SimpleHeaderProps) => {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between p-4 bg-transparent text-foreground">
      <button onClick={() => router.back()} className="p-2">
        <ChevronLeft className="h-6 w-6" />
      </button>
      <h1 className="font-bold text-lg">{title}</h1>
      <div className="relative p-2">
        <Bell className="h-6 w-6" />
        <span className="absolute top-1 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
      </div>
    </header>
  );
};

export { SimpleHeader };
