
"use client";

import Image from "next/image";
import React from 'react';

interface PromotionalImageProps {
    disableLink?: boolean;
}

/**
 * مكون يعرض شعار التطبيق الرئيسي بدلاً من الإعلانات المتغيرة.
 * يستخدم في صفحة تسجيل الدخول والواجهات الرئيسية لتعزيز الهوية البصرية.
 */
export function PromotionalImage({ disableLink = false }: PromotionalImageProps) {
    return (
        <div className="flex justify-center items-center py-6 animate-in fade-in-0 zoom-in-95 duration-700">
            <div className="relative w-[150px] h-[150px] overflow-hidden rounded-[40px] shadow-2xl border-4 border-white/20 dark:border-primary/20 bg-card">
                <Image 
                    src="https://i.postimg.cc/VvxBNG2N/Untitled-1.jpg" 
                    alt="Shabakat Wallet Logo" 
                    fill
                    className="object-cover p-1"
                    priority
                />
            </div>
        </div>
    );
}
