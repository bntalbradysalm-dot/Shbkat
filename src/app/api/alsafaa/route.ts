
import { NextResponse } from 'next/server';

/**
 * إعدادات الوصول لـ API شبكة الصفاء الرقمية - العنوان الجديد (Port 8086)
 */
const API_BASE = 'http://alsafa.ddns.net:8086'; 
const USER = 'TEST';
const PASS = '12341234';

/**
 * وظيفة مساعدة للحصول على مفتاح API صالح عبر تسجيل الدخول (POST)
 * يتم إرسال المعلمات في الرابط (Query Params) ولكن باستخدام طريقة POST
 */
async function getApiKey() {
    try {
        const loginUrl = `${API_BASE}/login?username=${USER}&password=${PASS}`;
        const res = await fetch(loginUrl, { 
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
            }
        });
        
        if (!res.ok) throw new Error('فشل الاتصال بسيرفر تسجيل الدخول (الصفاء).');
        
        const data = await res.json();
        
        // النظام يعيد مصفوفة، نتحقق من العنصر الأول ومن رمز الخطأ 100 (لا يوجد خطأ)
        if (Array.isArray(data) && data[0]) {
            if (data[0].errorid === '100') {
                return data[0].APIKEY;
            }
            throw new Error(data[0].errormsg || 'فشل التوثيق: رمز خطأ ' + data[0].errorid);
        }
        throw new Error('تنسيق استجابة غير معروف من سيرفر الصفاء.');
    } catch (error: any) {
        console.error('Safaa Login Error:', error);
        throw error;
    }
}

export async function POST(request: Request) {
    try {
        const { action, payload } = await request.json();
        
        // الحصول على APIKEY أولاً قبل أي عملية
        const apikey = await getApiKey();

        if (action === 'info') {
            // جلب معلومات الكرت والباقات المرتبطة به
            const infoUrl = `${API_BASE}/getcardinfo?cardid=${payload.cardNumber}&apikey=${apikey}`;
            const res = await fetch(infoUrl, { 
                method: 'POST',
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!res.ok) throw new Error('فشل جلب بيانات الكرت من المصدر.');
            
            const data = await res.json();
            
            // التحقق من صحة الاستجابة
            if (Array.isArray(data) && data.length > 0) {
                // إذا كان هناك خطأ في الاستعلام (مثل الكرت غير موجود)
                if (data[0].errorid && data[0].errorid !== '100') {
                    return NextResponse.json({ success: false, message: data[0].errormsg });
                }
                return NextResponse.json({ success: true, data });
            } else {
                return NextResponse.json({ success: false, message: 'الكرت غير موجود أو لا توجد باقات مرتبطة به.' });
            }
        }

        if (action === 'recharge') {
            // تنفيذ عملية التجديد لكرت كامل أو باقة محددة (subid)
            let rechargeUrl = `${API_BASE}/recharge?cardid=${payload.cardNumber}&apikey=${apikey}`;
            if (payload.subid) {
                rechargeUrl += `&subid=${payload.subid}`;
            }
            
            const res = await fetch(rechargeUrl, { 
                method: 'POST', 
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            
            if (!res.ok) throw new Error('فشل تنفيذ التجديد من المصدر.');
            
            const data = await res.json();

            // التحقق من نجاح العملية (errorid == 100)
            if (Array.isArray(data) && data[0] && data[0].errorid === '100') {
                return NextResponse.json({ 
                    success: true, 
                    message: data[0].errormsg || 'تمت العملية بنجاح', 
                    correlator: data[0].correlator 
                });
            } else {
                const errorMsg = (Array.isArray(data) && data[0]) ? data[0].errormsg : 'فشلت عملية التجديد من المصدر.';
                return NextResponse.json({ 
                    success: false, 
                    message: errorMsg 
                });
            }
        }

        return NextResponse.json({ success: false, message: 'الإجراء المطلوب غير معروف.' }, { status: 400 });

    } catch (error: any) {
        console.error('Safaa API Route Error:', error);
        return NextResponse.json({ success: false, message: error.message || 'حدث خطأ داخلي أثناء معالجة الطلب.' }, { status: 500 });
    }
}
