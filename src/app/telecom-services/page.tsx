'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronRight,
  Heart,
  HelpCircle,
  Smartphone,
  Contact,
} from 'lucide-react';
import Image from 'next/image';

type Company = {
  name: string;
  icon: string | React.ElementType;
  prefixes: string[];
  length: number;
  href: string;
};

const companies: Company[] = [
  {
    name: 'يمن موبايل',
    icon: 'https://i.postimg.cc/52nxCtk5/images.png',
    prefixes: ['77', '78'],
    length: 9,
    href: '/yemen-mobile-services',
  },
  {
    name: 'YOU',
    icon: 'https://i.postimg.cc/W3t9tD5B/Yo-Logo.png',
    prefixes: ['73', '71', '70'],
    length: 9,
    href: '/you-services',
  },
  {
    name: 'يمن فورجي',
    icon: 'https://i.postimg.cc/d1qWc06N/Yemen-4g-logo.png',
    prefixes: [''], // Handled by length
    length: 8,
    href: '/yemen-4g-services',
  },
  {
    name: 'الهاتف الثابت',
    icon: 'https://i.postimg.cc/d1qWc06N/Yemen-4g-logo.png', // Using same for landline
    prefixes: ['0'],
    length: 8, // e.g., 05333333
    href: '/landline-services',
  },
  {
    name: 'نت ADSL',
    icon: 'https://i.postimg.cc/d1qWc06N/Yemen-4g-logo.png', // Using same for ADSL
    prefixes: [''], // Handled by length
    length: 8,
    href: '/landline-services',
  },
];

const getCompanyFromNumber = (phone: string): Company | null => {
  if (!phone) return null;

  // Yemen Mobile logic
  if (phone.length === 9 && (phone.startsWith('77') || phone.startsWith('78'))) {
      return companies.find(c => c.name === 'يمن موبايل') || null;
  }
  // YOU logic
  if (phone.length === 9 && (phone.startsWith('73') || phone.startsWith('71') || phone.startsWith('70'))) {
      return companies.find(c => c.name === 'YOU') || null;
  }
  // Yemen 4G / ADSL / Landline logic
  if (phone.length === 8) {
      if (phone.startsWith('0')) return companies.find(c => c.name === 'الهاتف الثابت') || null;
      // Heuristic: If it's 8 digits and doesn't start with 0, it could be 4G or ADSL.
      // We'll need more info to distinguish, but for now we can group them.
      return companies.find(c => c.name === 'يمن فورجي') || null; // Defaulting to 4G for now
  }

  return null;
};


export default function TelecomPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identifiedCompany, setIdentifiedCompany] = useState<Company | null>(null);

  useEffect(() => {
    const company = getCompanyFromNumber(phoneNumber);
    setIdentifiedCompany(company);
  }, [phoneNumber]);

  const handleNext = () => {
    if (identifiedCompany) {
      // In a real app, you would navigate to the specific service page
      console.log(
        `Navigating to ${identifiedCompany.href} for number ${phoneNumber}`
      );
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-background"
      style={{
        backgroundImage: 'url("https://i.postimg.cc/zXN6p33v/pattern-bg.png")',
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
      }}
    >
      <header className="flex items-center p-4 bg-transparent text-foreground">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
            onClick={() => router.push('/favorites')}
          >
            <Heart className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
        <h1 className="font-bold text-lg text-center flex-1">رصيد وباقات</h1>
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className="h-9 w-9"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="relative group">
          <div className="absolute -left-px -top-px h-full w-14 flex items-center justify-center bg-muted rounded-r-xl border-r z-10">
            <Contact className="h-6 w-6 text-muted-foreground" />
          </div>
          <Input
            id="phone-number"
            type="tel"
            placeholder="ادخل رقم الجوال"
            className="h-16 text-center text-xl font-bold tracking-wider rounded-xl pl-4 pr-16 peer"
            value={phoneNumber}
            onChange={(e) =>
              setPhoneNumber(e.target.value.replace(/\D/g, ''))
            }
          />
           <Label htmlFor="phone-number" className="absolute right-16 top-1 text-xs text-muted-foreground transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-xs">
            رقم الجوال
          </Label>
        </div>
      </div>
    </div>
  );
}
