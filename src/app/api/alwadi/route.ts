'use server';

import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.alwaadi.net';
const DB = 'alwaadi'; 
const LOGIN = '770326M';
// استخدام مفتاح الواجهة البرمجية ككلمة مرور للمصادقة
const PASSWORD = '2e679271d1f9426f10e1f00100afc2016a33cd54';

/**
 * وظيفة للمصادقة والحصول على Session ID باستخدام بيانات الدخول والمفتاح
 */
async function authenticate() {
  const response = await fetch(`${BASE_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        db: DB,
        login: LOGIN,
        password: PASSWORD
      }
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.data?.message || 'فشل تسجيل الدخول للمنظومة');
  }

  const setCookie = response.headers.get('set-cookie');
  const sessionId = setCookie?.split(';')[0]?.split('=')[1] || data.result.session_id;

  return { sessionId, uid: data.result.uid };
}

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();
    const { sessionId, uid } = await authenticate();

    let endpoint = '/web/dataset/call_kw';
    let methodParams: any = {};

    if (action === 'search') {
      // استخدام onchange لجلب بيانات الكرت الحالية (تاريخ الانتهاء والمشترك)
      methodParams = {
        model: 'renewal.proces',
        method: 'onchange',
        args: [[], { "num_card": payload.number }, []],
        kwargs: {
          context: {
            lang: "ar_001",
            uid: uid
          }
        }
      };
    } else if (action === 'renew') {
      // إنشاء سجل تجديد جديد باستخدام create
      const refCode = `RP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100)}`;
      
      methodParams = {
        model: 'renewal.proces',
        method: 'create',
        args: [{
          "num_card": payload.num_card,
          "expiry_date": payload.expiry_date,
          "renewal_categories": payload.categoryId,
          "price": payload.price,
          "sales_centers": 59, // مركز البيع الافتراضي حسب التوثيق
          "payment_type": "نقد",
          "ref_code": refCode,
          "mobile": payload.mobile || ""
        }],
        kwargs: {
          context: {
            lang: "ar_001",
            tz: "Asia/Riyadh",
            uid: uid
          }
        }
      };
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': `session_id=${sessionId}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: methodParams,
        id: Math.floor(Math.random() * 1000)
      }),
    });

    const data = await response.json();

    if (data.error) {
        return new NextResponse(
            JSON.stringify({ message: data.error.data?.message || 'حدث خطأ في طلب المنظومة' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return NextResponse.json(data.result);

  } catch (error: any) {
    console.error('Alwadi API Error:', error);
    return new NextResponse(
      JSON.stringify({ message: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
