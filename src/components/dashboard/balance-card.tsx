"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import React, { useState } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";

type UserProfile = {
  balance?: number;
};

export function BalanceCard() {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const balance = userProfile?.balance ?? 0;
  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="animate-in fade-in-0 zoom-in-95 duration-500 px-4">
      <Card className="w-full overflow-hidden rounded-[40px] bg-primary text-primary-foreground shadow-xl border-none">
        <CardContent className="p-8 flex flex-col items-center justify-center min-h-[160px] relative">
          <p className="text-lg font-medium opacity-90 mb-2">ريال يمني</p>
          
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
              {isBalanceVisible ? <Eye size={28} /> : <EyeOff size={28} />}
            </Button>
          </div>

          <div className="mt-8 flex gap-1.5">
            <div className="h-1.5 w-6 rounded-full bg-white/30" />
            <div className="h-1.5 w-6 rounded-full bg-white/30" />
            <div className="h-1.5 w-12 rounded-full bg-white" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
