
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { X } from 'lucide-react';

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
      <DialogContent className="max-w-[80vw] sm:max-w-[280px] p-6 rounded-[40px] border-none shadow-2xl flex flex-col items-center text-center z-[10000] outline-none [&>button]:hidden bg-white">
        {/* أيقونة الخطأ الحمراء المطلوبة */}
        <div className="w-16 h-16 rounded-full border-[5px] border-destructive flex items-center justify-center mb-5 shadow-sm">
          <X className="h-10 w-10 text-destructive stroke-[3px]" />
        </div>
        
        {/* نص رسالة الخطأ */}
        <div className="mb-6">
            <p className="text-sm font-bold text-foreground leading-relaxed">
            {errorMessage}
            </p>
        </div>
        
        {/* زر إغلاق بتدرج التطبيق الأزرق في الأسفل */}
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
