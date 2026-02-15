'use server';

import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.alwaadi.net';
const DB = 'alwaadi'; 
const LOGIN = '770326M';
const PASSWORD = '2e679271d1f9426f10e1f00100afc2016a33cd54';

/**
 * وظيفة للمصادقة والحصول على Session ID
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

  return sessionId;
}

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();
    const sessionId = await authenticate();

    let endpoint = '/web/dataset/call_kw';
    let methodParams: any = {};

    if (action === 'search') {
      methodParams = {
        model: 'subscribers',
        method: 'web_search_read',
        args: [],
        kwargs: {
          specification: { 
            name_subscriber: {},
            mobile: {},
            num_card: {},
            expiry_date: {}
          },
          // تم التغيير للبحث برقم الكرت بدلاً من الهاتف
          domain: [['num_card', '=', payload.number]],
          limit: 5
        }
      };
    } else if (action === 'renew') {
      methodParams = {
        model: 'renewal.proces',
        method: 'create_other',
        args: [],
        kwargs: {
          values: {
            "subscriber": payload.subscriberId,
            "renewal_categories": payload.categoryId,
            "mobile": payload.mobile,
            "payment_type": "cash",
            "price": payload.price
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
        params: methodParams
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
