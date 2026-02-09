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

    // توليد رقم عملية فريد (12-15 رقم)
    const transid = payload.transid || `${Date.now()}`.slice(-10) + Math.floor(1000 + Math.random() * 9000);
    const token = generateToken(transid, payload.mobile);

    let apiBaseUrl = ''; 
    let endpoint = '';
    
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

    // تحديد النطاق والمسار بناءً على نوع الخدمة
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
                endpoint = '/yem';
        }
    }

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
        
        // رموز النجاح (0 للنجاح، -2 قيد التنفيذ)
        const isSuccess = data.resultCode === "0" || data.resultCode === 0;
        const isPending = data.resultCode === "-2" || data.resultCode === -2;

        if (!response.ok || (!isSuccess && !isPending)) {
            const errorMessage = data.resultDesc || data.message || 'حدث خطأ في النظام الخارجي.';
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