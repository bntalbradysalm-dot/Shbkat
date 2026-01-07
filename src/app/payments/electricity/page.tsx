'use client';

import React, { useState } from 'react';
import { SimpleHeader } from '@/components/layout/simple-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Bolt, User, MapPin, Search, Loader2, AlertTriangle, FileText, Calendar, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Separator } from '@/components/ui/separator';

type BillInfo = {
    bill_no: string;
    customer_name: string;
    arrears: string; // Overdue amount
    current_charges: string;
    total_due: string;
    last_date: string;
};

export default function ElectricityPage() {
    const [customerId, setCustomerId] = useState('');
    const [placeId, setPlaceId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [billInfo, setBillInfo] = useState<BillInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const handleQuery = async () => {
        if (!customerId || !placeId) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'الرجاء إدخال رقم المشترك ورقم المنطقة.',
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        setBillInfo(null);

        try {
            const response = await fetch('/api/electricity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customerId,
                    placeId: placeId,
                    action: 'query',
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'فشل الاستعلام عن الفاتورة.');
            }

            // Assuming the successful response has a specific structure.
            // Adjust this based on the actual API response.
            if (data.resultCode === "0" && data.bill_info) {
                setBillInfo(data.bill_info);
            } else {
                 throw new Error(data.resultDesc || 'لم يتم العثور على بيانات الفاتورة.');
            }

        } catch (err: any) {
            setError(err.message);
            setBillInfo(null);
        } finally {
            setIsLoading(false);
        }
    };

    const InfoRow = ({ label, value, icon: Icon }: { label: string, value: string, icon: React.ElementType }) => (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2 text-sm"><Icon className="h-4 w-4" />{label}</span>
            <span className="font-semibold text-sm">{value}</span>
        </div>
    );

    return (
        <>
            <div className="flex flex-col h-full bg-background">
                <SimpleHeader title="فواتير الكهرباء" />
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-center flex items-center justify-center gap-2">
                                <Bolt className="h-6 w-6" />
                                استعلام عن فاتورة كهرباء
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="customerId" className="flex items-center gap-2 mb-1"><User className="h-4 w-4" />رقم المشترك</Label>
                                <Input
                                    id="customerId"
                                    type="number"
                                    placeholder="أدخل رقم المشترك"
                                    value={customerId}
                                    onChange={(e) => setCustomerId(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="placeId" className="flex items-center gap-2 mb-1"><MapPin className="h-4 w-4" />رقم المنطقة</Label>
                                <Input
                                    id="placeId"
                                    type="number"
                                    placeholder="أدخل رقم المنطقة"
                                    value={placeId}
                                    onChange={(e) => setPlaceId(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <Button onClick={handleQuery} disabled={isLoading} className="w-full">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                        جاري الاستعلام...
                                    </>
                                ) : (
                                    <>
                                        <Search className="ml-2 h-4 w-4" />
                                        استعلام
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                    
                    {error && (
                        <div className="p-4 flex flex-col items-center justify-center text-center gap-2 text-destructive">
                             <AlertTriangle className="h-8 w-8" />
                             <p className="font-semibold">حدث خطأ</p>
                             <p className="text-sm">{error}</p>
                        </div>
                    )}
                    
                    {billInfo && (
                        <CardContent className="border-t pt-4 mt-4 animate-in fade-in-0">
                            <h3 className="text-center font-bold mb-4">تفاصيل الفاتورة</h3>
                            <div className="space-y-3">
                                <InfoRow label="اسم العميل" value={billInfo.customer_name} icon={User} />
                                <InfoRow label="رقم الفاتورة" value={billInfo.bill_no} icon={FileText} />
                                <InfoRow label="المبلغ المتأخر" value={`${Number(billInfo.arrears).toLocaleString('en-US')} ريال`} icon={Hash} />
                                <InfoRow label="المبلغ الحالي" value={`${Number(billInfo.current_charges).toLocaleString('en-US')} ريال`} icon={Hash} />
                                <InfoRow label="آخر موعد للسداد" value={billInfo.last_date} icon={Calendar} />
                                <Separator className="my-2"/>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-base flex items-center gap-2"><FileText className="h-5 w-5" />الإجمالي للدفع</span>
                                    <span className="font-bold text-xl text-primary">{Number(billInfo.total_due).toLocaleString('en-US')} ريال</span>
                                </div>
                                <Button className="w-full !mt-6" disabled>
                                    الدفع (قيد التطوير)
                                </Button>
                            </div>
                        </CardContent>
                    )}

                </div>
            </div>
            <Toaster />
        </>
    );
}
