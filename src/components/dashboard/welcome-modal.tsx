'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

/**
 * مكون المنبثق الترحيبي/الترويجي.
 * يظهر فور فتح التطبيق لمدة يومين فقط.
 */
export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // تحديد تاريخ الانتهاء: 27 فبراير 2025
    const expiryDate = new Date('2025-02-27T23:59:59').getTime();
    const now = new Date().getTime();
    
    // إذا انتهت المدة، لا تظهر المنبثق
    if (now > expiryDate) {
        return;
    }

    // التحقق مما إذا كان المستخدم قد أغلق المنبثق مسبقاً
    const isDismissed = localStorage.getItem('welcome_promo_immediate_v3');
    if (!isDismissed) {
      // إظهار المنبثق فوراً بدون تأخير
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // حفظ حالة الإغلاق لعدم الظهور مرة أخرى
    localStorage.setItem('welcome_promo_immediate_v3', 'true');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[90vw] sm:max-w-[400px] p-0 overflow-hidden border-none bg-transparent shadow-none gap-0 outline-none [&>button]:hidden flex flex-col items-center">
        <div className="relative w-full flex flex-col items-center animate-in zoom-in-95 duration-500">
          {/* حاوية الصورة الطولية */}
          <div className="relative w-full aspect-[9/16] rounded-[40px] overflow-hidden shadow-2xl border-4 border-white/20 bg-card">
            <Image 
              src="https://i.postimg.cc/SNtjK4ZZ/IMG-20260224-WA0012.jpg" 
              alt="Welcome Promo" 
              fill 
              className="object-cover"
              priority
              unoptimized
            />
          </div>
          
          {/* زر الإغلاق السفلي */}
          <div className="w-full px-2">
            <Button 
                onClick={handleClose}
                className="mt-6 w-full h-14 rounded-3xl bg-white text-primary hover:bg-white/90 font-black text-xl shadow-2xl border-b-4 border-primary/20 active:translate-y-1 transition-all"
            >
                إغلاق الإعلان
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
