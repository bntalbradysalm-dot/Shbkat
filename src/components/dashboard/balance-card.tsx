"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, MoreHorizontal, Settings2, PlusCircle, CreditCard, Send, ShoppingBag, Wifi, ClipboardList, Landmark, Smartphone, ArrowLeftRight } from "lucide-react";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import Link from "next/link";

type UserProfile = {
  balance?: number;
};

const availableServices = [
  { id: 'pay-bills', name: 'مدفوعات', icon: CreditCard, href: '/telecom-services' },
  { id: 'transfer', name: 'حوالات', icon: Send, href: '/transfer' },
  { id: 'withdraw', name: 'سحب نقدي', icon: Smartphone, href: '/top-up' },
  { id: 'exchange', name: 'مصارفة', icon: ArrowLeftRight, href: '/transfer' },
  { id: 'store', name: 'مشتريات', icon: ShoppingBag, href: '/store' },
  { id: 'telecom', name: 'رصيد وباقات', icon: Smartphone, href: '/telecom-services' },
  { id: 'digital-cards', name: 'البطائق الرقمية', icon: CreditCard, href: '/services' },
  { id: 'statement', name: 'كشف حساب', icon: ClipboardList, href: '/transactions' },
  { id: 'banking', name: 'الخدمات البنكية', icon: Landmark, href: '/top-up' },
];

export function BalanceCard() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [leftAction, setLeftAction] = useState(availableServices[5]); // Default: رصيد وباقات
  const [rightAction, setRightAction] = useState(availableServices[6]); // Default: البطائق الرقمية
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingSide, setEditingSide] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    const savedLeft = localStorage.getItem('balance_card_left');
    const savedRight = localStorage.getItem('balance_card_right');
    if (savedLeft) setLeftAction(JSON.parse(savedLeft));
    if (savedRight) setRightAction(JSON.parse(savedRight));
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
      localStorage.setItem('balance_card_left', JSON.stringify(service));
    } else {
      setRightAction(service);
      localStorage.setItem('balance_card_right', JSON.stringify(service));
    }
    setIsConfigOpen(false);
  };

  const ActionButton = ({ service, side }: { service: typeof availableServices[0], side: 'left' | 'right' }) => {
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
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/10 hover:bg-white/20 transition-colors rounded-2xl text-white text-xs font-bold border border-white/5 backdrop-blur-sm"
        >
          <service.icon size={16} />
          <span>{service.name}</span>
        </button>
      </Link>
    );
  };

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-500 px-4">
      <Card className="w-full overflow-hidden rounded-[40px] bg-mesh-gradient text-primary-foreground shadow-2xl border-none">
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[200px] relative">
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center px-4">
             <p className="text-xs font-medium opacity-60">اضغط مطولاً لتغيير الأزرار</p>
             <Settings2 size={14} className="opacity-40" />
          </div>

          <p className="text-sm font-medium opacity-90 mb-1 mt-2">ريال يمني</p>
          
          <div className="flex items-center gap-4">
            <h2 className="text-5xl font-bold tracking-tight">
              {isLoading ? (
                <Skeleton className="h-12 w-32 bg-white/20" />
              ) : isBalanceVisible ? (
                balance.toLocaleString('en-US')
              ) : (
                "******"
              )}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="h-10 w-10 rounded-full hover:bg-white/20 text-white"
            >
              {isBalanceVisible ? <Eye size={24} /> : <EyeOff size={24} />}
            </Button>
          </div>

          <div className="mt-8 flex gap-3 w-full">
            <ActionButton service={leftAction} side="left" />
            <ActionButton service={rightAction} side="right" />
          </div>

          <div className="mt-6 flex gap-1.5">
            <div className="h-1.5 w-6 rounded-full bg-white/30" />
            <div className="h-1.5 w-6 rounded-full bg-white/30" />
            <div className="h-1.5 w-12 rounded-full bg-white shadow-sm" />
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
            {availableServices.map((service) => (
              <Button
                key={service.id}
                variant="outline"
                className="flex flex-col h-24 gap-2 rounded-2xl border-primary/10 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => selectService(service)}
              >
                <service.icon className="h-8 w-8 text-primary" />
                <span className="text-xs font-bold">{service.name}</span>
              </Button>
            ))}
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