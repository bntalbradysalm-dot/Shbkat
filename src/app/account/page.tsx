'use client';

import React from 'react';
import {
  ChevronLeft,
  LayoutGrid,
  Phone,
  User,
  MapPin,
  Users,
  Wifi,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleHeader } from '@/components/layout/simple-header';

const managementLinks = [
  { title: 'إدارة المستخدمين', icon: Users, href: '/users-management' },
  { title: 'إدارة الشبكات', icon: Wifi, href: '/networks-management' },
  { title: 'إدارة الكروت', icon: CreditCard, href: '/cards-management' },
];

export default function AccountPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="حسابي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card className="overflow-hidden shadow-lg bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <User className="h-10 w-10 shrink-0 text-muted-foreground" />
            <div className="flex-grow">
              <h2 className="text-lg font-bold">محمد راضي ربيع باشادي</h2>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <div className="flex items-center">
                  <Phone className="ml-2 h-4 w-4" />
                  <span>770326828</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="ml-2 h-4 w-4" />
                  <span>حضرموت - شبام</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              لوحة التحكم
            </h3>
          </div>

          <Card className="bg-card">
            <CardContent className="p-0">
              {managementLinks.map((link, index) => (
                <a
                  href={link.href}
                  key={link.title}
                  className={`group flex items-center justify-between p-4 cursor-pointer ${
                    index < managementLinks.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-semibold">{link.title}</span>
                  </div>
                  <ChevronLeft className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
