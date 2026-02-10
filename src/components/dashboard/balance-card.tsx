"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  CreditCard, 
  Wallet, 
  Smartphone, 
  Wifi, 
  SatelliteDish, 
  ShoppingBag, 
  Heart, 
  Send, 
  History,
  Settings2
} from "lucide-react";
import React, { useState, useEffect, useRef } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

type UserProfile = {
  balance?: number;
};

type Shortcut = {
  id: string;
  name: string;
  icon: any;
  href: string;
};

const allServices = [
  { id: 'telecom', name: 'رصيد وباقات', icon: Smartphone, href: '/telecom-services' },
  { id: 'networks', name: 'الشبكات', icon: Wifi, href: '/services' },
  { id: 'alwadi', name: 'منظومة الوادي', icon: SatelliteDish, href: '/alwadi' },
  { id: 'store', name: 'متجر ستار ميديا', icon: ShoppingBag, href: '/store' },
  { id: 'favorites', name: 'المفضلة', icon: Heart, href: '/favorites' },
  { id: 'transfer', name: 'تحويل لمشترك', icon: Send, href: '/transfer' },
  { id: 'topup', name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
  { id: 'transactions', name: 'سجل العمليات', icon: History, href: '/transactions' },
];

export function BalanceCard() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [shortcuts, setShortcuts] = useState<{ s1: string; s2: string }>({ s1: 'topup', s2: 'alwadi' });
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [activeShortcutSlot, setActiveShortcutSlot] = useState<'s1' | 's2' | null>(null);
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const balance = userProfile?.balance ?? 0;
  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    const saved = localStorage.getItem('user_shortcuts');
    if (saved) {
      try {
        setShortcuts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load shortcuts");
      }
    }
  }, []);

  const toggleVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  const handleLongPress = (slot: 's1' | 's2') => {
    setActiveShortcutSlot(slot);
    setIsSelectionOpen(true);
  };

  const startPress = (slot: 's1' | 's2') => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress(slot);
    }, 600); // 600ms long press
  };

  const endPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const selectShortcut = (serviceId: string) => {
    if (!activeShortcutSlot) return;
    const newShortcuts = { ...shortcuts, [activeShortcutSlot]: serviceId };
    setShortcuts(newShortcuts);
    localStorage.setItem('user_shortcuts', JSON.stringify(newShortcuts));
    setIsSelectionOpen(false);
    setActiveShortcutSlot(null);
  };

  const getService = (id: string) => allServices.find(s => s.id === id) || allServices[0];

  const renderShortcutButton = (slot: 's1' | 's2') => {
    const service = getService(shortcuts[slot]);
    const Icon = service.icon;

    return (
      <div 
        className="w-full relative"
        onMouseDown={() => startPress(slot)}
        onMouseUp={endPress}
        onMouseLeave={endPress}
        onTouchStart={() => startPress(slot)}
        onTouchEnd={endPress}
      >
        <Link href={service.href} className="w-full">
          <Button 
            variant="secondary" 
            className="flex items-center justify-center bg-white/20 hover:bg-white/30 text-primary-foreground font-bold rounded-lg w-full h-11"
          >
            <Icon className="h-4 w-4 ml-2" />
            {service.name}
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-500">
      <Card className="w-full overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-sm text-primary-foreground/80">
            <span className="font-medium">الرصيد الحالي</span>
            <div className="flex items-center gap-1">
               <span className="text-[10px] opacity-60 ml-2">اضغط مطولاً لتغيير الأزرار</span>
               <Button
                variant="ghost"
                size="icon"
                onClick={toggleVisibility}
                className="h-8 w-8 rounded-full hover:bg-white/20 focus-visible:ring-white"
                aria-label={isBalanceVisible ? "إخفاء الرصيد" : "إظهار الرصيد"}
              >
                {isBalanceVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>
          <div className="mt-2 text-right" aria-live="polite">
            {isLoading ? (
              <Skeleton className="h-10 w-48 bg-white/30" />
            ) : (
               <h2 className="text-4xl font-bold tracking-tighter">
                {isBalanceVisible ? (
                  <>
                    {balance.toLocaleString('en-US')}
                    <span className="text-base font-medium mr-2">ريال يمني</span>
                  </>
                ) : (
                  <span className="tracking-widest">******</span>
                )}
              </h2>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {renderShortcutButton('s1')}
            {renderShortcutButton('s2')}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSelectionOpen} onOpenChange={setIsSelectionOpen}>
        <DialogContent className="max-w-[90%] rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">اختر الاختصار المفضل</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {allServices.map((service) => {
              const Icon = service.icon;
              return (
                <Button
                  key={service.id}
                  variant="outline"
                  className={`h-auto py-4 flex flex-col gap-2 rounded-xl ${shortcuts.s1 === service.id || shortcuts.s2 === service.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => selectShortcut(service.id)}
                >
                  <div className="p-2 bg-muted rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-bold">{service.name}</span>
                </Button>
              );
            })}
          </div>
          <DialogClose asChild>
            <Button variant="ghost" className="w-full">إلغاء</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
