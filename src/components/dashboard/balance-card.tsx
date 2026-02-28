"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Smartphone, ArrowLeftRight, SatelliteDish, Wifi, History, Wallet, MessageCircleQuestion, Heart, Gamepad2 } from "lucide-react";
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

const availableServices = [
  { id: 'pay-bills', name: 'تسديد رصيد', icon: Smartphone, href: '/telecom-services' },
  { id: 'digital-cards', name: 'الشبكات', icon: Wifi, href: '/services' },
  { id: 'alwadi', name: 'منظومة الوادي', icon: SatelliteDish, href: '/alwadi' },
  { id: 'withdraw', name: 'غذي حسابك', icon: Wallet, href: '/top-up' },
  { id: 'games', name: 'شدات ببجي', icon: Gamepad2, href: '/games' },
  { id: 'favorites', name: 'المفضلة', icon: Heart, href: '/favorites' },
  { id: 'exchange', name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
  { id: 'statement', name: 'سجل العمليات', icon: History, href: '/transactions' },
  { id: 'support', name: 'الدعم الفني', icon: MessageCircleQuestion, href: '/support' },
];

type UserProfile = {
  balance?: number;
};

export function BalanceCard() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [leftAction, setLeftAction] = useState(availableServices[5]); // Default: المفضلة
  const [rightAction, setRightAction] = useState(availableServices[1]); // Default: الشبكات
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
    () => (user && firestore ? doc(firestore, "users", user.uid) : null),
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
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/20 hover:bg-white/30 transition-colors rounded-xl text-white text-[10px] font-bold border border-white/10 backdrop-blur-sm"
        >
          <Icon size={12} />
          <span>{service.name}</span>
        </button>
      </Link>
    );
  };

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-500 px-4">
      <Card className="overflow-hidden border-none shadow-lg bg-mesh-gradient text-white rounded-[32px]">
        <CardContent className="p-6 flex flex-col items-center justify-center relative">
          
          <div className="w-full relative flex flex-col items-center justify-center mb-4">
            <div className="absolute left-0 top-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                    className="h-8 w-8 rounded-full hover:bg-white/10 text-white/70"
                >
                    {isBalanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                </Button>
            </div>

            <div className="flex items-baseline justify-center gap-2">
                <h2 className="text-4xl font-black tracking-tight text-white">
                {isLoading ? (
                    <Skeleton className="h-10 w-28 bg-white/20" />
                ) : isBalanceVisible ? (
                    balance.toLocaleString('en-US')
                ) : (
                    "******"
                )}
                </h2>
                <span className="text-sm font-bold text-white/80">ريال يمني</span>
            </div>
          </div>

          <div className="flex gap-2 w-full max-w-[280px]">
            <ActionButton service={leftAction} side="left" />
            <ActionButton service={rightAction} side="right" />
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
