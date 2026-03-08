import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

// المعلمات المعتمدة من متغيرات البيئة
const USERID = process.env.TELECOM_USERID;
const USERNAME = process.env.TELECOM_USERNAME;
const PASSWORD = process.env.TELECOM_PASSWORD;
const API_BASE_URL = 'https://echehanly.yrbso.net/api/yr/'; 

const generateToken = (transid: string, identifier: string) => {
  if (!PASSWORD || !USERNAME) return '';
  const hashPassword = CryptoJS.MD5(PASSWORD).toString();
  const tokenString = hashPassword + transid + USERNAME + identifier;
  return CryptoJS.MD5(tokenString).toString();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, service, ...payload } = body;
    
    if (!USERID || !USERNAME || !PASSWORD) {
        return new NextResponse(JSON.stringify({ message: 'Telecom settings are missing in environment variables' }), { status: 500 });
    }

    const identifier = payload.mobile || payload.playerid || USERNAME;
    const transid = payload.transid || `${Date.now()}`.slice(-10);
    const token = generateToken(transid, identifier);

    let endpoint = '';
    let apiRequestParams: any = {
      userid: USERID,
      transid: transid,
      token: token,
      ...payload
    };
    
    if (service === 'yem4g') {
        endpoint = 'yem4g';
        apiRequestParams.action = action;
    } else if (service === 'post') {
        endpoint = 'post';
        apiRequestParams.action = action;
    } else if (service === 'adenet') {
        endpoint = 'adenet';
        apiRequestParams.action = action;
    } else if (service === 'you') {
        if (action === 'billoffer' || action === 'queryoffer') {
            endpoint = 'mtnoffer';
            delete apiRequestParams.action;
        } else {
            endpoint = 'mtn';
            apiRequestParams.action = action;
        }
    } else if (service === 'games') {
        endpoint = 'gameswcards';
    } else { 
        switch(action) {
            case 'query':
            case 'bill':
            case 'solfa':
            case 'queryoffer':
                endpoint = 'yem';
                apiRequestParams.action = action;
                break;
            case 'billoffer':
                endpoint = 'offeryem';
                apiRequestParams.action = 'billoffer';
                if (!apiRequestParams.method) {
                    apiRequestParams.method = 'Renew';
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // زيادة المهلة لـ 90 ثانية

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            },
            cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        const responseText = (await response.text()).trim();
        
        if (!responseText) throw new Error('رد فارغ من السيرفر.');

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            const balanceMatch = responseText.match(/Your balance:?\s*([\d.]+)/i);
            if (balanceMatch) {
                return NextResponse.json({ 
                    balance: balanceMatch[1], 
                    resultCode: "0",
                    resultDesc: responseText
                });
            }
            return new NextResponse(JSON.stringify({ message: responseText, resultCode: "-1" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(timeoutId);
        let friendlyMessage = fetchError.message;
        if (fetchError.name === 'AbortError') {
            friendlyMessage = 'انتهت مهلة الطلب. السيرفر بطيء جداً في الرد.';
        } else if (fetchError.message.includes('fetch failed')) {
            friendlyMessage = 'فشل الاتصال التقني بمزود الخدمة. قد يكون هناك حظر IP أو السيرفر متوقف حالياً.';
        }
        return new NextResponse(JSON.stringify({ message: 'تنبيه: ' + friendlyMessage }), { status: 504 });
    }
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ message: `خطأ داخلي: ${error.message}` }), { status: 500 });
  }
}
