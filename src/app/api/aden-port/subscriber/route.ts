
import { NextResponse } from 'next/server';

const ODOO_URL = 'https://api.alwaadi.net/jsonrpc';
const ODOO_API_KEY = 'e3dc910be14a0f1ea325d6a0794a0e586227afae';

export async function POST(req: Request) {
  try {
    const { number } = await req.json();

    if (!number) {
      return NextResponse.json({ success: false, message: 'رقم المشترك مطلوب' }, { status: 400 });
    }

    const response = await fetch(ODOO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ODOO_API_KEY}`
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "renewal.proces",
          method: "search_read",
          args: [[["subscriber", "ilike", number]]],
          kwargs: {
            fields: ["subscriber"]
          }
        },
        id: 1
      })
    });

    const data = await response.json();

    if (data.result && data.result.length > 0) {
      return NextResponse.json({
        success: true,
        subscriber: data.result[0].subscriber[1], // display_name
        subscriber_id: data.result[0].subscriber[0] // id
      });
    }

    return NextResponse.json({
      success: false,
      message: 'المشترك غير موجود في قاعدة البيانات'
    });

  } catch (error: any) {
    console.error('Aden Port Inquiry Error:', error);
    return NextResponse.json({ success: false, message: 'فشل الاتصال بسيرفر المنظومة' }, { status: 500 });
  }
}
