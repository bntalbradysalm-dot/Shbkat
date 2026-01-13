'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Smartphone, Phone, Wifi } from 'lucide-react';
import Image from 'next/image';

type Company = {
  name: string;
  icon: string | React.ElementType;
  prefixes: string[];
  length: number;
  servicePage: string;
  type: 'mobile' | 'line' | 'adsl';
};

const companies: Company[] = [
  {
    name: 'يمن موبايل',
    icon: 'https://i.postimg.cc/52nxCtk5/images.png',
    prefixes: ['77'],
    length: 9,
    servicePage: '/telecom-services',
    type: 'mobile'
  },
  {
    name: 'YOU',
    icon: 'https://i.postimg.cc/W3t9tD5B/Yo-Logo.png',
    prefixes: ['73', '71', '70'],
    length: 9,
    servicePage: '/telecom-services', // Assuming same page for now
    type: 'mobile'
  },
  {
    name: 'يمن فورجي',
    icon: 'https://i.postimg.cc/d1qWc06N/Yemen-4g-logo.png',
    prefixes: [],
    length: 8,
    servicePage: '/telecom-services',
    type: 'mobile'
  },
  {
    name: 'الهاتف الثابت',
    icon: Phone,
    prefixes: ['0'], 
    length: 8,
    servicePage: '/landline-services',
    type: 'line'
  },
   {
    name: 'نت ADSL',
    icon: Wifi,
    prefixes: [''],
    length: 8,
    servicePage: '/landline-services',
    type: 'adsl'
  },
];

const getCompanyFromNumber = (phone: string): Company | null => {
    if (!phone) return null;

    for (const company of companies) {
        const phoneLength = phone.length;

        if (company.name === 'الهاتف الثابت') {
            if (phoneLength >= 2 && phone.startsWith('0')) return company;
        } else if (company.name === 'نت ADSL') {
            if (phoneLength >= 1 && !isNaN(Number(phone))) return company; // Very generic for ADSL
        } else if (company.length === phoneLength) {
            if (company.prefixes.length > 0 && company.prefixes.some(p => phone.startsWith(p))) {
                return company;
            }
            if (company.prefixes.length === 0) { // For companies identified by length alone like Yemen 4G
                 return company;
            }
        }
    }
    return null;
};


export default function TelecomRedirectPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identifiedCompany, setIdentifiedCompany] = useState<Company | null>(null);
  const router = useRouter();

  useEffect(() => {
    const company = getCompanyFromNumber(phoneNumber);
    setIdentifiedCompany(company);
  }, [phoneNumber]);

  const handleNext = () => {
    if (identifiedCompany) {
      const typeParam = identifiedCompany.type === 'line' ? 'line' : 'internet';
      router.push(`${identifiedCompany.servicePage}?phone=${phoneNumber}&type=${typeParam}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="رصيد وباقات" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="shadow-lg">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold">تسديد فواتير وشحن رصيد</h2>
            <p className="text-muted-foreground mt-2">أدخل رقم الهاتف للبدء</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
            <div className='relative'>
                <Input
                    id="phone-number"
                    type="tel"
                    placeholder="ادخل الرقم هنا..."
                    className="h-16 text-center text-2xl font-bold tracking-widest"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                />
                {identifiedCompany && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-in fade-in-0">
                        {typeof identifiedCompany.icon === 'string' ? (
                            <Image src={identifiedCompany.icon} alt={identifiedCompany.name} width={24} height={24} className="rounded-md" />
                        ) : (
                            <identifiedCompany.icon className="h-6 w-6 text-muted-foreground" />
                        )}
                        <span className="text-sm font-semibold text-muted-foreground">{identifiedCompany.name}</span>
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="p-3 text-xs text-muted-foreground space-y-2">
                    <p>• <span className="font-semibold text-primary">يمن موبايل:</span> يبدأ بـ 77 (9 أرقام)</p>
                    <p>• <span className="font-semibold text-primary">YOU/سبأفون:</span> يبدأ بـ 73/71/70 (9 أرقام)</p>
                    <p>• <span className="font-semibold text-primary">يمن فورجي / نت:</span> رقم المشترك (8 أرقام)</p>
                    <p>• <span className="font-semibold text-primary">الهاتف الثابت:</span> يبدأ بـ 0 (8 أرقام)</p>
                </CardContent>
            </Card>
        </div>

        <Button 
            className="w-full h-12 text-lg font-bold"
            disabled={!identifiedCompany}
            onClick={handleNext}
        >
            التالي
            <ChevronLeft className="mr-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
