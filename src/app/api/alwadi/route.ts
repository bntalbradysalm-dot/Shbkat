
'use server';

import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.alwaadi.net';
const DB = 'alwaadi';
const LOGIN = '770326M';
const PASSWORD = '770326828moh';

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

  // الحصول على Session ID من ملفات تعريف الارتباط أو الرد
  const setCookie = response.headers.get('set-cookie');
  const sessionId = setCookie?.split(';')[0]?.split('=')[1] || data.result.session_id;

  return sessionId;
}

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();
    const sessionId = await authenticate();

    let endpoint = '';
    let methodParams: any = {};

    if (action === 'search') {
      // البحث برقم المشترك باستخدام web_search_read
      endpoint = '/web/dataset/call_kw/subscribers/web_search_read';
      methodParams = {
        model: 'subscribers',
        method: 'web_search_read',
        args: [],
        kwargs: {
          specification: { 
            display_name: {},
            number_subscriber: {}
          },
          domain: [['number_subscriber', '=', payload.number]],
          offset: 0,
          limit: 5
        }
      };
    } else if (action === 'renew') {
      endpoint = '/web/dataset/call_kw/renewal.proces/create_other';
      methodParams = {
        model: 'renewal.proces',
        method: 'create_other',
        args: [[payload.subscriberId]],
        kwargs: {}
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

    // Odoo web_search_read returns { records: [], length: X } or sometimes just the list depending on config
    return NextResponse.json(data.result);

  } catch (error: any) {
    console.error('Alwadi API Error:', error);
    return new NextResponse(
      JSON.stringify({ message: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
