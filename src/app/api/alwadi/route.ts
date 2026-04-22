
'use server';

import { NextResponse } from 'next/server';

const API_URL = 'https://api.alwaadi.net/jsonrpc';
const API_KEY = process.env.ALWADI_API_KEY;
const USER_ID = process.env.ALWADI_USER_ID ? parseInt(process.env.ALWADI_USER_ID) : 51;

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();

    if (!API_KEY) {
        throw new Error('ALWADI_API_KEY is not defined');
    }

    let methodParams: any = {};

    if (action === 'search') {
      methodParams = {
        model: 'renewal.proces',
        method: 'onchange',
        args: [[], { "num_card": payload.number }, []],
        kwargs: {
          context: {
            lang: "ar_001",
            uid: USER_ID
          }
        }
      };
    } else if (action === 'renew') {
      methodParams = {
        model: 'renewal.proces',
        method: 'create',
        args: [{
          "num_card": payload.num_card,
          "renewal_categories": parseInt(payload.categoryId),
          "payment_type": payload.payment_type || "نقد"
        }],
        kwargs: {
          context: {
            lang: "ar_001",
            tz: "Asia/Riyadh",
            uid: USER_ID
          }
        }
      };
    } else if (action === 'get_categories') {
        methodParams = {
            model: 'renewal.proces',
            method: 'get_categories',
            args: [],
            kwargs: { context: { lang: "ar_001" } }
        };
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: methodParams,
        id: Date.now()
      }),
    });

    const data = await response.json();

    if (data.error) {
        return new NextResponse(
            JSON.stringify({ message: data.error.message || 'حدث خطأ في طلب المنظومة' }),
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
