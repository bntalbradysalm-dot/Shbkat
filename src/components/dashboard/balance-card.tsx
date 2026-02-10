"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Settings2, CreditCard, Send, ShoppingBag, History, Wallet, Smartphone, ArrowLeftRight, SatelliteDish, Wifi, FileText, Heart } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Link from "next/link";

type UserProfile = {
  balance?: number;
};

const availableServices = [
  { id: 'pay-bills', name: 'تسديد رصيد', icon: Smartphone, href: '/telecom-services' },
  { id: 'transfer', name: 'حوالات', icon: Send, href: '/transfer' },
  { id: 'withdraw', name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
  { id: 'exchange', name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
  { id: 'store', name: 'مشتريات', icon: ShoppingBag, href: '/store' },
  { id: 'favorites', name: 'المفضلة', icon: Heart, href: '/favorites' },
  { id: 'digital-cards', name: 'الشبكات', icon: Wifi, href: '/services' },
  { id: 'statement', name: 'سجل العمليات', icon: History, href: '/transactions' },
  { id: 'alwadi', name: 'منظومة الوادي', icon: SatelliteDish, href: '/alwadi' },
];

export function BalanceCard() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [leftAction, setLeftAction] = useState(availableServices[5]); // Default: المفضلة
  const [rightAction, setRightAction] = useState(availableServices[6]); // Default: الشبكات
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    const savedLeftId = localStorage.getItem('balance_card_left_id');
    const savedRightId = localStorage.getItem('balance_card_right_id');
    
    if (savedLeftId) {
        const service = availableServices.find(s => s.id === savedLeftId);
        if (service) setLeftAction(service);
    }
    if (savedRightId) {
        const service = availableServices.find(s => s.id === savedRightId);
        if (service) setRightAction(service);
    }
  }, []);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const balance = userProfile?.balance ?? 0;
  const isLoading = isUserLoading || isProfileLoading;

  const handleLongPress = (side: 'left' | 'right') => {
    setEditingSide(side);
    setIsConfigOpen(true);
  };

  const selectService = (service: typeof availableServices[0]) => {
    if (editingSide === 'left') {
      setLeftAction(service);
      localStorage.setItem('balance_card_left_id', service.id);
    } else {
      setRightAction(service);
      localStorage.setItem('balance_card_right_id', service.id);
    }
    setIsConfigOpen(false);
  };

  const ActionButton = ({ service, side }: { service: typeof availableServices[0], side: 'left' | 'right' }) => {
    const Icon = service.icon;
    let timer: any;
    const startTimer = () => {
      timer = setTimeout(() => handleLongPress(side), 600);
    };
    const clearTimer = () => clearTimeout(timer);

    return (
      <Link href={service.href} className="flex-1">
        <button
          onMouseDown={startTimer}
          onMouseUp={clearTimer}
          onMouseLeave={clearTimer}
          onTouchStart={startTimer}
          onTouchEnd={clearTimer}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/10 hover:bg-white/20 transition-colors rounded-2xl text-white text-xs font-bold border border-white/5 backdrop-blur-sm"
        >
          <Icon size={14} />
          <span>{service.name}</span>
        </button>
      </Link>
    );
  };

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-500 px-4">
      <Card className="w-full overflow-hidden rounded-[32px] bg-mesh-gradient text-white shadow-xl border-none">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[170px] relative">
          <div className="absolute top-3 left-4 right-4 flex justify-between items-center px-2">
             <p className="text-[10px] font-medium opacity-60">اضغط مطولاً لتغيير الأزرار</p>
             <Settings2 size={12} className="opacity-40" />
          </div>

          <div className="w-full relative flex items-center justify-center mt-2">
            <div className="absolute left-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                    className="h-8 w-8 rounded-full hover:bg-white/20 text-white"
                >
                    {isBalanceVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                </Button>
            </div>

            <div className="flex items-baseline gap-2">
                <h2 className="text-4xl font-bold tracking-tight text-white">
                {isLoading ? (
                    <Skeleton className="h-10 w-28 bg-white/20" />
                ) : isBalanceVisible ? (
                    balance.toLocaleString('en-US')
                ) : (
                    "******"
                )}
                </h2>
                <span className="text-xs font-medium opacity-90 text-white">ريال يمني</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3 w-full">
            <ActionButton service={leftAction} side="left" />
            <ActionButton service={rightAction} side="right" />
          </div>

          <div className="mt-4 flex gap-1.5">
            <div className="h-1 w-4 rounded-full bg-white/30" />
            <div className="h-1 w-4 rounded-full bg-white/30" />
            <div className="h-1 w-8 rounded-full bg-white shadow-sm" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="rounded-[32px] max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">اختيار اختصار مفضل</DialogTitle>
            <DialogDescription className="text-center">
              اختر الخدمة التي تريد وضعها في {editingSide === 'left' ? 'الجهة اليمنى' : 'الجهة اليسرى'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {availableServices.map((service) => {
              const ServiceIcon = service.icon;
              return (
                <Button
                  key={service.id}
                  variant="outline"
                  className="flex flex-col h-24 gap-2 rounded-2xl border-primary/10 hover:bg-primary/5 hover:border-primary/30"
                  onClick={() => selectService(service)}
                >
                  <ServiceIcon className="h-8 w-8 text-primary" />
                  <span className="text-xs font-bold">{service.name}</span>
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" className="w-full rounded-2xl">إلغاء</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
