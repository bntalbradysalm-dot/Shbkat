"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Send, Wallet } from "lucide-react";
import React from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type UserProfile = {
  balance?: number;
};

export function BalanceCard() {
  const [isBalanceVisible, setIsBalanceVisible] = React.useState(true);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const balance = userProfile?.balance ?? 0;
  const isLoading = isUserLoading || isProfileLoading;

  const toggleVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-500">
      <Card className="w-full overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-sm text-primary-foreground/80">
            <span>الرصيد الحالي</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVisibility}
              className="h-8 w-8 rounded-full hover:bg-white/20 focus-visible:ring-white"
              aria-label={isBalanceVisible ? "إخفاء الرصيد" : "إظهار الرصيد"}
              aria-pressed={isBalanceVisible}
            >
              {isBalanceVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
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
            <Link href="/top-up">
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-primary-foreground font-bold rounded-lg w-full">
                    <Wallet className="ml-2 h-4 w-4" />
                    تغذية الحساب
                </Button>
            </Link>
            <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-primary-foreground font-bold rounded-lg">
              <Send className="ml-2 h-4 w-4" />
              تحويل
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
