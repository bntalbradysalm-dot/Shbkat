'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

// المعلمات المعتمدة والحصرية لمزود الخدمة
const USERID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';
// الرابط الأساسي المعتمد للسيرفر بعد تحديث النطاق
const API_BASE_URL = 'https://echehanlyw.yrbso.net/api/yr/'; 

/**
 * وظيفة إنشاء الرمز المميز (Token) المطلوبة من المزود
 * المعادلة المعتمدة: md5(md5(Password) + transid + Username + mobile)
 */
const generateToken = (transid: string, identifier: string) => {
  const hashPassword = CryptoJS.MD5(PASSWORD).toString();
  // الترتيب حساس جداً: md5(hashPassword + transid + Username + identifier)
  const tokenString = hashPassword + transid + USERNAME + identifier;
  return CryptoJS.MD5(tokenString).toString();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, service, ...payload } = body;
    
    // المعرف (identifier) هو رقم الهاتف (mobile) أو رقم اللاعب (playerid)
    const identifier = payload.mobile || payload.playerid || USERNAME;

    // توليد رقم عملية فريد
    const transid = payload.transid || `${Date.now()}`.slice(-10);
    const token = generateToken(transid, identifier);

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
        // تم تحديث ربط يمن فورجي وفق المتطلبات الجديدة
        endpoint = 'yem4g';
        apiRequestParams.action = action;
        // يتم إرسال amount و type تلقائياً من الـ payload في حال كان الإجراء bill
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
    const fullUrl = `${API_BASE_URL}${endpoint}?${params.toString()}`;

    // إعداد مهلة انتظار طويلة (60 ثانية) لضمان استلام الرد
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

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
        
        if (!responseText) {
            throw new Error('السيرفر استجاب برد فارغ.');
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // محاولة استخراج الرصيد إذا كان الرد نصياً يحتوي على "Your balance"
            const balanceMatch = responseText.match(/Your balance:?\s*([\d.]+)/i);
            if (balanceMatch) {
                return NextResponse.json({ 
                    balance: balanceMatch[1], 
                    resultCode: "0",
                    resultDesc: responseText,
                    message: 'تم استخراج البيانات من الرد النصي.' 
                });
            }
            
            return new NextResponse(JSON.stringify({ 
                message: 'رد السيرفر: ' + responseText,
                raw: responseText,
                resultCode: "-1" 
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // تحديث الرصيد تلقائياً من أي نص رد يحتوي عليه
        const searchString = JSON.stringify(data);
        const balanceRegex = /Your balance:?\s*([\d.]+)/i;
        const balMatch = searchString.match(balanceRegex);
        if (balMatch && (data.balance === undefined || data.balance === null)) {
            data.balance = balMatch[1];
        }
        
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
            return new NextResponse(JSON.stringify({ message: 'انتهت مهلة الاتصال بالمزود (60 ثانية). السيرفر لا يستجيب حالياً.' }), { status: 504 });
        }
        return new NextResponse(JSON.stringify({ message: 'تعذر الوصول إلى سيرفر المزود: ' + fetchError.message }), { status: 504 });
    }

  } catch (error: any) {
    return new NextResponse(
      JSON.stringify({ message: `خطأ داخلي في الطلب: ${error.message}` }),
      { status: 500 }
    );
  }
}
