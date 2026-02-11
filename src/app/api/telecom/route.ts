'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const USERID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

/**
 * وظيفة إنشاء الرمز المميز (Token) بناءً على المواصفات:
 * hashPassword = md5(Password)
 * token = md5(hashPassword + transid + Username + mobile)
 */
const generateToken = (transid: string, mobile: string) => {
  const hashPassword = CryptoJS.MD5(PASSWORD).toString();
  const tokenString = hashPassword + transid + USERNAME + mobile;
  return CryptoJS.MD5(tokenString).toString();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, service, ...payload } = body;
    
    if (!payload.mobile) {
        return new NextResponse(JSON.stringify({ message: 'رقم الهاتف مطلوب.' }), { status: 400 });
    }

    // توليد رقم عملية فريد إذا لم يتوفر
    const transid = payload.transid || `${Date.now()}`.slice(-10) + Math.floor(1000 + Math.random() * 9000);
    const token = generateToken(transid, payload.mobile);

    // الرابط الأساسي للمزود
    let apiBaseUrl = 'https://echehanly.yrbso.net/api/yr/'; 
    let endpoint = '';
    
    // إعداد المعايير المرسلة للـ API
    let apiRequestParams: any = {
      action: action,
      userid: USERID,
      transid: transid,
      token: token,
      ...payload
    };
    
    // تحديد النطاق والمسار بناءً على نوع الخدمة
    if (service === 'post') {
        // للهاتف الثابت و ADSL
        endpoint = 'post';
    } else if (service === 'yem4g') {
        // ليمن فورجي (استعلام وسداد)
        endpoint = 'yem4g';
    } else if (service === 'adenet') {
        // عدن نت (استعلام وسداد)
        endpoint = 'adenet';
    } else { 
        switch(action) {
            case 'query':
            case 'bill':
            case 'solfa':
            case 'queryoffer':
            case 'billoffer':
                endpoint = 'yem';
                break;
            case 'billover': 
                endpoint = 'offeryem';
                apiRequestParams.action = 'billoffer';
                if (apiRequestParams.offertype) {
                    apiRequestParams.offerkey = apiRequestParams.offertype;
                    delete apiRequestParams.offertype;
                }
                if (!apiRequestParams.method) apiRequestParams.method = 'New';
                if (!apiRequestParams.solfa) apiRequestParams.solfa = 'N';
                break;
            case 'status':
            case 'balance':
                endpoint = 'info';
                break;
            default:
                endpoint = 'yem';
        }
    }

    // إزالة المعايير الداخلية التي لا يحتاجها المزود
    delete apiRequestParams.service;

    const params = new URLSearchParams(apiRequestParams);
    const fullUrl = `${apiBaseUrl}${endpoint}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        const responseText = await response.text();
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            return new NextResponse(JSON.stringify({ message: 'فشل تحليل استجابة المزود. تأكد من صحة البيانات.' }), { status: 502 });
        }
        
        // رموز الاستجابة حسب الوثائق:
        // "0" للنجاح
        // "-2" قيد التنفيذ (Pending)
        const isSuccess = data.resultCode === "0" || data.resultCode === 0;
        const isPending = data.resultCode === "-2" || data.resultCode === -2;

        if (!response.ok || (!isSuccess && !isPending)) {
            let errorMessage = data.resultDesc || data.message || 'حدث خطأ في النظام الخارجي.';
            
            // تحويل رسائل الخطأ الشائعة
            if (errorMessage.includes('1009') || errorMessage.includes('منطقة التحصيل')) {
                errorMessage = 'الرقم ليس من مناطق التحصيل المسموح بها';
            }

            return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
            return new NextResponse(JSON.stringify({ message: 'انتهت مهلة الاتصال بالمزود، يرجى المحاولة لاحقاً.' }), { status: 504 });
        }
        throw fetchError;
    }

  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ message: `خطأ في المعالجة: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
