'use client';

import React from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SatelliteDish, ChevronLeft, Info } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type RenewalOption = {
  id: string;
  title: string;
  price: number;
};

export default function AlwadiPage() {
  const firestore = useFirestore();

  // جلب خيارات التجديد المضافة يدوياً من قبل الإدارة
  const optionsCollection = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'alwadiOptions'), orderBy('price', 'asc')) : null),
    [firestore]
  );
  const { data: options, isLoading } = useCollection<RenewalOption>(optionsCollection);

  return (
    <div className="flex flex-col h-full bg-background">
      <SimpleHeader title="منظومة الوادي" />
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {/* Banner */}
        <Card className="bg-mesh-gradient text-white border-none rounded-[32px] overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-500">
            <CardContent className="p-8 text-center space-y-2">
                <div className="bg-white/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-2 backdrop-blur-md border border-white/10">
                    <SatelliteDish className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-black">تجديد اشتراك الوادي</h2>
                <p className="text-xs opacity-80 font-bold">اختر الباقة المطلوبة لإرسال طلب تجديد يدوي</p>
            </CardContent>
        </Card>

        {/* Packages List */}
        <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">باقات التجديد المتوفرة</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">نظام يدوي</span>
            </div>
            
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                </div>
            ) : options && options.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {options.map((option, index) => (
                        <Link 
                            key={option.id} 
                            href={`/alwadi/renew?title=${encodeURIComponent(option.title)}&price=${option.price}`}
                            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <Card className="group hover:bg-primary/5 transition-all active:scale-[0.98] cursor-pointer border-none shadow-sm rounded-2xl overflow-hidden bg-card">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-right">
                                        <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                            <SatelliteDish className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <h4 className="font-bold text-foreground text-sm">{option.title}</h4>
                                            <p className="text-[10px] text-muted-foreground font-bold">إرسال طلب تجديد</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-left">
                                            <p className="font-black text-primary text-base">
                                                {option.price.toLocaleString('en-US')} 
                                                <span className="text-[10px] mr-1">ريال</span>
                                            </p>
                                        </div>
                                        <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:-translate-x-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed">
                    <Info className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-bold">لا توجد باقات متوفرة حالياً.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">يرجى التواصل مع الإدارة لإضافة الباقات.</p>
                </div>
            )}
        </div>
        
        {/* Important Info */}
        <div className="bg-primary/5 p-5 rounded-[24px] border border-primary/10 space-y-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                تنبيهات هامة:
            </h4>
            <ul className="text-[10px] text-muted-foreground leading-relaxed list-disc pr-4 space-y-1 font-bold">
                <li>يتم خصم المبلغ من رصيدك فور إرسال الطلب.</li>
                <li>سيقوم فريق الدعم بتنفيذ الطلب وتجديد كرتك في أقرب وقت.</li>
                <li>في حال رفض الطلب، سيتم إعادة المبلغ تلقائياً إلى محفظتك.</li>
                <li>تأكد من إدخال رقم الكرت واسم المشترك بشكل صحيح لتجنب التأخير.</li>
            </ul>
        </div>
      </div>
    </div>
  );
}
