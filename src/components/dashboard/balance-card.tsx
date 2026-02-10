"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Smartphone, ArrowLeftRight, SatelliteDish, Wifi, History, Wallet, ShoppingBag, Heart, Ticket } from "lucide-react";
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
  { id: 'store', name: 'المشتريات', icon: ShoppingBag, href: '/store' },
  { id: 'favorites', name: 'المفضلة', icon: Heart, href: '/favorites' },
  { id: 'exchange', name: 'تحويل لمشترك', icon: ArrowLeftRight, href: '/transfer' },
  { id: 'statement', name: 'سجل العمليات', icon: History, href: '/transactions' },
  { id: 'transfer', name: 'حجوزات', icon: Ticket, href: '#', isComingSoon: true },
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
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
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

    const handleClick = (e: React.MouseEvent) => {
        if (service.isComingSoon) {
            e.preventDefault();
            setIsComingSoonOpen(true);
        }
    };

    return (
      <Link href={service.href} className="flex-1" onClick={handleClick}>
        <button
          onMouseDown={startTimer}
          onMouseUp={clearTimer}
          onMouseLeave={clearTimer}
          onTouchStart={startTimer}
          onTouchEnd={clearTimer}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-white text-[10px] font-bold border border-white/5 backdrop-blur-sm"
        >
          <Icon size={12} />
          <span>{service.name}</span>
        </button>
      </Link>
    );
  };

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-500 px-4">
      <Card className="w-full overflow-hidden rounded-[28px] bg-mesh-gradient text-white shadow-lg border-none">
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px] relative">
          
          <div className="w-full relative flex flex-col items-center justify-center mt-8 mb-2">
            <div className="absolute left-0 top-0">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                    className="h-7 w-7 rounded-full hover:bg-white/20 text-white"
                >
                    {isBalanceVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
            </div>

            <div className="flex items-baseline gap-1.5 pt-2">
                <h2 className="text-3xl font-black tracking-tight text-white">
                {isLoading ? (
                    <Skeleton className="h-8 w-24 bg-white/20" />
                ) : isBalanceVisible ? (
                    balance.toLocaleString('en-US')
                ) : (
                    "******"
                )}
                </h2>
                <span className="text-[10px] font-bold opacity-80 text-white">ريال يمني</span>
            </div>
          </div>

          <div className="mt-6 flex gap-2 w-full">
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

      <Dialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen}>
        <DialogContent className="rounded-[32px] max-w-sm">
          <DialogHeader>
            <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Ticket className="text-primary h-8 w-8" />
            </div>
            <DialogTitle className="text-center text-xl font-black">قريباً</DialogTitle>
            <DialogDescription className="text-center text-base font-bold">
              هذه الخدمة ستكون متاحة قريباً في تحديثات التطبيق القادمة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button className="w-full rounded-2xl h-12 font-black">حسناً</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}