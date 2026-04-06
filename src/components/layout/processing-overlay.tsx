'use client';

import React, { useEffect } from 'react';

const CustomLoader = () => (
  <div className="bg-card/95 p-4 rounded-3xl shadow-2xl flex items-center justify-center w-24 h-24 animate-in zoom-in-95 border border-white/10 backdrop-blur-md">
    <div className="relative w-12 h-12">
      <svg
        viewBox="0 0 50 50"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        <path
          d="M15 25 A10 10 0 0 0 35 25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M40 15 A15 15 0 0 1 40 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-30"
        />
      </svg>
    </div>
  </div>
);

/**
 * مؤشر تحميل شفاف مع ضبابية خفيفة (Backdrop Blur) يظهر فوق المحتوى.
 * تم تعديله ليمنع التفاعل مع الصفحة أو الخروج منها تماماً أثناء معالجة الطلبات.
 */
export const ProcessingOverlay = ({ message }: { message: string }) => {
  // منع التمرير عند ظهور الغطاء لضمان ثبات الواجهة
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    // محاولة تقييد حركة الصفحة في الجوال
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.body.style.overflow = originalStyle;
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center animate-in fade-in-0 p-4 pointer-events-auto backdrop-blur-md bg-black/40">
      <div className="flex flex-col items-center justify-center gap-6 text-center animate-in zoom-in-95 duration-500">
        <CustomLoader />
        <div className="space-y-2">
            <p className="text-base font-black text-white animate-pulse drop-shadow-md">{message}</p>
            <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                <p className="text-[10px] text-white/80 font-bold">الرجاء عدم إغلاق التطبيق أو العودة للخلف</p>
            </div>
        </div>
      </div>
    </div>
  );
};
