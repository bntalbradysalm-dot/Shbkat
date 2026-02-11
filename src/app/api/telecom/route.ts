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
    
    // في حالة الألعاب قد لا يكون الموبايل هو الحقل الأساسي، نستخدم رقم اللاعب أو الموبايل
    const identifier = payload.mobile || payload.playerid || '000';

    // توليد رقم عملية فريد إذا لم يتوفر
    const transid = payload.transid || `${Date.now()}`.slice(-10) + Math.floor(1000 + Math.random() * 9000);
    const token = generateToken(transid, identifier);

    // الرابط الأساسي للمزود
    let apiBaseUrl = 'https://echehanly.yrbso.net/api/yr/'; 
    let endpoint = '';
    
    // إعداد المعايير المرسلة للـ API
    let apiRequestParams: any = {
      userid: USERID,
      transid: transid,
      token: token,
      ...payload
    };
    
    // تحديد النطاق والمسار بناءً على نوع الخدمة
    if (service === 'post') {
        endpoint = 'post';
        apiRequestParams.action = action;
    } else if (service === 'yem4g') {
        endpoint = 'yem4g';
        apiRequestParams.action = action;
    } else if (service === 'adenet') {
        endpoint = 'adenet';
        apiRequestParams.action = action;
    } else if (service === 'games') {
        // رابط شحن الألعاب الموضح في الصورة
        endpoint = 'gameswcards';
        // الألعاب عادة تستخدم GET وتمرر الحقول في URL
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
                if (!apiRequestParams.method) apiRequestParams.method = 'New';
                if (!apiRequestParams.solfa) apiRequestParams.solfa = 'N';
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

    // إزالة المعايير الداخلية
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
            return new NextResponse(JSON.stringify({ message: 'فشل تحليل استجابة المزود.' }), { status: 502 });
        }
        
        const isSuccess = data.resultCode === "0" || data.resultCode === 0;
        const isPending = data.resultCode === "-2" || data.resultCode === -2;

        if (!response.ok || (!isSuccess && !isPending)) {
            let errorMessage = data.resultDesc || data.message || 'حدث خطأ في النظام الخارجي.';
            return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
            return new NextResponse(JSON.stringify({ message: 'انتهت مهلة الاتصال بالمزود.' }), { status: 504 });
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
