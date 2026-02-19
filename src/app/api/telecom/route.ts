
'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const USERID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

/**
 * وظيفة إنشاء الرمز المميز (Token)
 * الترتيب المطلوب: md5(md5(Password) + transid + Username + mobile)
 */
const generateToken = (transid: string, identifier: string) => {
  const hashPassword = CryptoJS.MD5(PASSWORD).toString();
  const tokenString = hashPassword + transid + USERNAME + identifier;
  return CryptoJS.MD5(tokenString).toString();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, service, ...payload } = body;
    
    // المعرف (identifier) هو رقم الهاتف (mobile) أو رقم اللاعب (playerid)
    // وفي حال طلب الرصيد نستخدم اسم المستخدم (USERNAME) كمعرف للهاش
    const identifier = payload.mobile || payload.playerid || USERNAME;

    // توليد رقم عملية فريد بطول 10 أرقام
    const transid = payload.transid || `${Date.now()}`.slice(-10);
    const token = generateToken(transid, identifier);

    // الرابط المعتمد لواجهة برمجة التطبيقات (API URL)
    const apiBaseUrl = 'https://echehanly.yrbso.net/api/yr/'; 
    let endpoint = '';
    
    let apiRequestParams: any = {
      userid: USERID,
      transid: transid,
      token: token,
      ...payload
    };
    
    // تحديد الـ Endpoint بناءً على نوع الخدمة
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
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 
                'Accept': 'application/json, text/plain, */*',
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        const responseRaw = await response.text();
        const responseText = responseRaw.trim();
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // محاولة استخراج الرصيد إذا كان الرد نصياً وليس JSON
            const balanceMatch = responseText.match(/Your balance:?\s*([\d.]+)/i);
            if (balanceMatch) {
                return NextResponse.json({ 
                    balance: balanceMatch[1], 
                    resultCode: "0",
                    resultDesc: responseText,
                    message: 'تم استخراج البيانات من الرد النصي.' 
                });
            }
            
            // في حال وجود رد نصي غير متوقع، نرجعه بدلاً من رسالة خطأ مبهمة
            if (responseText && responseText.length < 500) {
                return new NextResponse(JSON.stringify({ 
                    message: 'رد المزود: ' + responseText,
                    raw: responseText,
                    resultCode: "-1" 
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            
            return new NextResponse(JSON.stringify({ message: 'فشل في تحليل بيانات المزود.' }), { status: 502 });
        }

        // البحث عن الرصيد في أي حقل نصي ضمن الرد (حتى في رسائل الخطأ) لتحديث رصيد الوكيل
        const searchString = JSON.stringify(data);
        const balanceRegex = /Your balance:?\s*([\d.]+)/i;
        const balMatch = searchString.match(balanceRegex);
        if (balMatch && (data.balance === undefined || data.balance === null)) {
            data.balance = balMatch[1];
        }
        
        if (action === 'balance') {
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
            return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
                status: 200, // نستخدم 200 لضمان وصول الرسالة للواجهة الأمامية ومعالجتها كـ Error
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
            return new NextResponse(JSON.stringify({ message: 'انتهت مهلة الاتصال بالمزود (45 ثانية). يرجى المحاولة مرة أخرى.' }), { status: 504 });
        }
        return new NextResponse(JSON.stringify({ message: 'تعذر الاتصال بسيرفر المزود حالياً.' }), { status: 504 });
    }

  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ message: `خطأ داخلي: ${error.message}` }),
      { status: 500 }
    );
  }
}
