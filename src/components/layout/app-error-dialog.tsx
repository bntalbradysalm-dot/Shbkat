'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * منبثق الأخطاء العالمي - تم تصغيره وتحديثه ليتوافق مع طلب المستخدم.
 * يستمع للأحداث 'custom-error' من باعث الأخطاء العالمي.
 */
export function AppErrorDialog() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (message: string) => {
      setErrorMessage(message);
    };

    errorEmitter.on('custom-error', handleError);
    return () => errorEmitter.off('custom-error', handleError);
  }, []);

  const handleClose = () => {
    setErrorMessage(null);
  };

  return (
    <Dialog open={!!errorMessage} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[80vw] sm:max-w-[280px] p-6 rounded-[40px] border-none shadow-2xl flex flex-col items-center text-center z-[10000] outline-none [&>button]:hidden">
        {/* أيقونة المعلومات البرتقالية المطلوبة */}
        <div className="w-16 h-16 rounded-full border-[5px] border-[#FEA500] flex items-center justify-center mb-5 shadow-sm">
          <span className="text-4xl font-black text-[#FEA500] leading-none select-none">i</span>
        </div>
        
        {/* نص رسالة الخطأ */}
        <p className="text-sm font-bold text-foreground mb-6 leading-relaxed">
          {errorMessage}
        </p>
        
        {/* زر إغلاق بتدرج التطبيق الأزرق */}
        <Button 
          onClick={handleClose}
          className="w-full h-12 rounded-full bg-mesh-gradient text-white font-black text-base shadow-lg active:scale-95 transition-all border-none"
        >
          إغلاق
        </Button>
      </DialogContent>
    </Dialog>
  );
}
