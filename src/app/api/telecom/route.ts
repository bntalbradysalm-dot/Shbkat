'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const USERID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

// وظيفة لتوليد التوقيع (Token) حسب توثيق اشحن لي
const generateToken = (transid: string, mobile: string) => {
  const hashPassword = CryptoJS.MD5(PASSWORD).toString();
  // التوقيع هو MD5 لـ (كلمة المرور المشفرة + رقم العملية + اسم المستخدم + رقم الهاتف)
  const token = CryptoJS.MD5(hashPassword + transid + USERNAME + mobile).toString();
  return token;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, service, ...payload } = body;
    
    if (!payload.mobile) {
        return new NextResponse(JSON.stringify({ message: 'رقم الهاتف مطلوب.' }), { status: 400 });
    }

    // توليد رقم عملية فريد جداً لتجنب التداخل عند الاستعلامات المتعددة
    const transid = payload.transid || `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const token = generateToken(transid, payload.mobile);

    let endpoint = '';
    let apiBaseUrl = ''; 
    
    // إعداد المعايير المرسلة للـ API
    let apiRequestParams: any = {
      action: action,
      userid: USERID,
      transid: transid,
      token: token,
      ...payload
    };
    
    // إزالة المعايير الداخلية التي لا يحتاجها الـ API الخارجي
    delete apiRequestParams.service;

    // توجيه الطلب إلى النطاق الصحيح بناءً على نوع الخدمة
    if (service === 'yem4g') {
        apiBaseUrl = 'https://echehanly.yrbso.net';
        endpoint = '/api/yr/'; 
    } else { 
        apiBaseUrl = 'https://echehanlyw.yrbso.net';
        switch(action) {
            case 'query':
            case 'bill':
            case 'solfa':
            case 'queryoffer':
                endpoint = '/yem';
                break;
            case 'billover':
                endpoint = '/offeryem';
                break;
            case 'status':
            case 'balance':
                endpoint = '/info';
                break;
            default:
                return new NextResponse(JSON.stringify({ message: 'الإجراء المطلوب غير صالح.' }), { status: 400 });
        }
    }

    const params = new URLSearchParams(apiRequestParams);
    const fullUrl = `${apiBaseUrl}${endpoint}?${params.toString()}`;

    // تعيين مهلة اتصال 20 ثانية
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });
        
        clearTimeout(id);
        const responseText = await response.text();
        
        // تسجيل العمليات في السيرفر للمتابعة عند حدوث مشاكل (غير مرئي للمستخدم)
        console.log(`[API CALL] Action: ${action}, Mobile: ${payload.mobile}, URL: ${fullUrl}`);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("[API ERROR] Could not parse response:", responseText);
            return new NextResponse(JSON.stringify({ message: 'استجابة غير صالحة من المزود.' }), { status: 502 });
        }
        
        // رموز النجاح حسب النظام
        const isSuccess = data.resultCode === "0";
        // التعامل مع حالة "تحت التنفيذ" كاستجابة مقبولة للاستعلام
        const isPending = data.resultCode === "-2" || (data.resultDesc && data.resultDesc.toLowerCase().includes('under process'));

        if (!response.ok || (data.resultCode && !isSuccess && !isPending)) {
            const errorMessage = data.resultDesc || 'حدث خطأ في النظام الخارجي.';
            return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(id);
        if (fetchError.name === 'AbortError') {
            return new NextResponse(JSON.stringify({ message: 'انتهت مهلة الاتصال بالمزود، يرجى المحاولة لاحقاً.' }), { status: 504 });
        }
        throw fetchError;
    }

  } catch (error: any) {
    console.error(`Error in /api/telecom:`, error);
    return new NextResponse(
      JSON.stringify({ message: `خطأ داخلي: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
