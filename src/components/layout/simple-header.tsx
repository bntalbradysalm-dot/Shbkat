'use client';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SimpleHeaderProps = {
  title: string;
};

const SimpleHeader = ({ title }: SimpleHeaderProps) => {
  const router = useRouter();

  return (
    <header className="flex items-center p-4 bg-transparent text-foreground">
      <button onClick={() => router.back()} className="p-2 absolute">
        <ChevronRight className="h-6 w-6" />
      </button>
      <h1 className="font-medium text-lg text-center flex-1">{title}</h1>
    </header>
  );
};

export { SimpleHeader };
