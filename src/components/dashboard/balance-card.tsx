"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Eye, EyeOff, Send } from "lucide-react";
import React from 'react';

export function BalanceCard() {
  const [isBalanceVisible, setIsBalanceVisible] = React.useState(true);
  const balance = 150000;

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
          <div className="mt-2 text-center" aria-live="polite">
            <h2 className="text-4xl font-bold tracking-tighter">
              {isBalanceVisible ? `${balance.toLocaleString('en-US')} ريال` : '******'}
            </h2>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-primary-foreground font-bold rounded-lg">
              <ArrowUpRight className="ml-2 h-4 w-4" />
              تغذية الحساب
            </Button>
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
