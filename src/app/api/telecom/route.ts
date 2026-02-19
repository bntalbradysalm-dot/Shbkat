'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const USERID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

/**
 * وظيفة إنشاء الرمز المميز (Token)
 * لعمليات الرصيد: الهاش يعتمد على كلمة المرور، رقم العملية، واسم المستخدم فقط.
 * للعمليات الأخرى: يضاف رقم الهاتف للسلسلة.
 */
const generateToken = (transid: string, identifier: string, isBalance: boolean) => {
  const hashPassword = CryptoJS.MD5(PASSWORD).toString();
  const tokenString = isBalance 
    ? hashPassword + transid + USERNAME
    : hashPassword + transid + USERNAME + identifier;
  return CryptoJS.MD5(tokenString).toString();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, service, ...payload } = body;
    
    const isBalanceReq = action === 'balance';
    const identifier = payload.mobile || payload.playerid || USERNAME;

    // توليد رقم عملية بطول معقول (8 أرقام) لضمان التوافق
    const transid = payload.transid || `${Date.now()}`.slice(-8);
    const token = generateToken(transid, identifier, isBalanceReq);

    let apiBaseUrl = 'https://echehanly.yrbso.net/api/yr/'; 
    let endpoint = '';
    
    let apiRequestParams: any = {
      userid: USERID,
      transid: transid,
      token: token,
      ...payload
    };
    
    if (service === 'post') {
        endpoint = 'post';
        apiRequestParams.action = action;
    } else if (service === 'yem4g') {
        endpoint = 'yem4g';
        apiRequestParams.action = action;
    } else if (service === 'adenet') {
        endpoint = 'adenet';
        apiRequestParams.action = action;
    } else if (service === 'you') {
        endpoint = 'mtn';
        apiRequestParams.action = action;
    } else if (service === 'games') {
        endpoint = 'gameswcards';
    } else { 
        switch(action) {
            case 'query':
            case 'bill':
            case 'solfa':
            case 'queryoffer':
            case 'billoffer':
                endpoint = 'yem';
                apiRequestParams.action = action;
                break;
            case 'billover': 
                endpoint = 'offeryem';
                apiRequestParams.action = 'billoffer';
                if (apiRequestParams.offertype) {
                    apiRequestParams.offerkey = apiRequestParams.offertype;
                    delete apiRequestParams.offertype;
                }
                break;
            case 'status':
            case 'balance':
                endpoint = 'info';
                apiRequestParams.action = action;
                break;
            default:
                endpoint = 'yem';
                apiRequestParams.action = action;
        }
    }

    delete apiRequestParams.service;

    const params = new URLSearchParams(apiRequestParams);
    const fullUrl = `${apiBaseUrl}${endpoint}?${params.toString()}`;

    const controller = new AbortController();
    // زيادة المهلة إلى 45 ثانية للتعامل مع بطء السيرفرات الخارجية
    const timeoutId = setTimeout(() => controller.abort(), 45000);

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
            // المحاولة الأخيرة: البحث عن الرصيد في الرد النصي الخام إذا فشل الـ JSON
            const balanceMatch = responseText.match(/Your balance:?\s*([\d.]+)/i);
            if (balanceMatch) {
                return NextResponse.json({ balance: balanceMatch[1], message: 'تم استخراج الرصيد من الرد النصي.' });
            }
            console.error('API Raw Response:', responseText);
            return new NextResponse(JSON.stringify({ message: 'رد غير صالح من المزود.' }), { status: 502 });
        }

        // استخراج الرصيد من أي حقل نصي إذا لم يتوفر كحقل مستقل (ذكاء اصطناعي للرصيد)
        const searchString = JSON.stringify(data);
        const balanceMatch = searchString.match(/Your balance:?\s*([\d.]+)/i);
        if (balanceMatch && (data.balance === undefined || data.balance === null)) {
            data.balance = balanceMatch[1];
        }
        
        // التحقق من الرصيد بشكل خاص
        if (isBalanceReq) {
            if (data.balance !== undefined && data.balance !== null) {
                return NextResponse.json(data);
            }
            return new NextResponse(JSON.stringify({ message: data.resultDesc || 'فشل جلب الرصيد', ...data }), { status: 400 });
        }

        const code = data.resultCode?.toString().trim();
        const isSuccess = code === "0";
        const isPending = code === "-2";

        if (!response.ok || (!isSuccess && !isPending)) {
            let errorMessage = data.resultDesc || data.message || 'حدث خطأ في النظام الخارجي.';
            // إرسال البيانات المستخرجة حتى في حالة الخطأ لضمان تحديث الرصيد إذا وجد
            return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
            return new NextResponse(JSON.stringify({ message: 'انتهت مهلة الاتصال بالمزود. يرجى المحاولة مرة أخرى.' }), { status: 504 });
        }
        return new NextResponse(JSON.stringify({ message: 'تعذر الاتصال بالمزود حالياً.' }), { status: 504 });
    }

  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ message: `خطأ داخلي: ${error.message}` }),
      { status: 500 }
    );
  }
}