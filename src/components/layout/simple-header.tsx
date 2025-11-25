'use client';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SimpleHeaderProps = {
  title: string;
};

const SimpleHeader = ({ title }: SimpleHeaderProps) => {
  const router = useRouter();

  return (
    <header className="flex items-center p-4 bg-primary text-primary-foreground">
      <button onClick={() => router.back()} className="p-2 absolute">
        <ChevronLeft className="h-6 w-6 text-primary-foreground" />
      </button>
      <h1 className="font-bold text-lg text-center flex-1">{title}</h1>
    </header>
  );
};

export { SimpleHeader };
