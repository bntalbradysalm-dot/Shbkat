
import { NextResponse } from 'next/server';

/**
 * إعدادات الوصول لـ API شبكة الصفاء الرقمية
 * يتم جلب الرابط من متغيرات البيئة لضمان المرونة
 */
const API_BASE = process.env.ALSAFAA_API_URL || 'https://api.alsafaa.net'; 
const USER = 'TEST';
const PASS = '12341234';

/**
 * وظيفة مساعدة للحصول على مفتاح API صالح عبر تسجيل الدخول
 */
async function getApiKey() {
    try {
        const res = await fetch(`${API_BASE}/login?username=${USER}&password=${PASS}`, { 
            method: 'POST',
            cache: 'no-store'
        });
        const data = await res.json();
        if (data && data[0] && data[0].errorid === '100') {
            return data[0].APIKEY;
        }
        throw new Error(data[0]?.errormsg || 'فشل تسجيل الدخول لـ API الصفاء');
    } catch (error: any) {
        console.error('Safaa Login Error:', error);
        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const { action, payload } = await request.json();
        const apikey = await getApiKey();

        if (action === 'info') {
            // جلب معلومات الكرت والباقات المرتبطة به
            const res = await fetch(`${API_BASE}/getcardinfo?cardid=${payload.cardNumber}&apikey=${apikey}`, { 
                method: 'POST',
                cache: 'no-store'
            });
            const data = await res.json();
            
            // التحقق من صحة الاستجابة (النظام يعيد مصفوفة من الباقات)
            if (data && Array.isArray(data) && data.length > 0) {
                return NextResponse.json({ success: true, data });
            } else {
                return NextResponse.json({ success: false, message: 'الكرت غير موجود أو لا توجد باقات مرتبطة به.' });
            }
        }

        if (action === 'plans') {
            // جلب الباقات المتاحة للتجديد بناءً على رقم الباقة الحالية
            const res = await fetch(`${API_BASE}/plansavail?apikey=${apikey}&planid=${payload.planid}`, { 
                method: 'POST',
                cache: 'no-store'
            });
            const data = await res.json();
            return NextResponse.json({ success: true, data });
        }

        if (action === 'recharge') {
            // تنفيذ عملية التجديد لكرت كامل أو باقة محددة (subid)
            let url = `${API_BASE}/recharge?cardid=${payload.cardNumber}&apikey=${apikey}`;
            if (payload.subid) {
                url += `&subid=${payload.subid}`;
            }
            
            const res = await fetch(url, { method: 'POST', cache: 'no-store' });
            const data = await res.json();

            if (data && data[0] && data[0].errorid === '100') {
                return NextResponse.json({ success: true, message: data[0].errormsg, correlator: data[0].correlator });
            } else {
                return NextResponse.json({ success: false, message: data[0]?.errormsg || 'فشلت عملية التجديد من المصدر.' });
            }
        }

        return NextResponse.json({ success: false, message: 'الإجراء المطلوب غير معروف.' }, { status: 400 });

    } catch (error: any) {
        console.error('Safaa API Route Error:', error);
        return NextResponse.json({ success: false, message: error.message || 'حدث خطأ داخلي أثناء معالجة الطلب.' }, { status: 500 });
    }
}
