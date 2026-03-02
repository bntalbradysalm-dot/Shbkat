
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EXTERNAL_API_URL = 'https://apis.baitynet.net/api/partner/networks';

export async function GET() {
  const API_KEY = process.env.BAITYNET_NETWORKS_API_KEY;

  if (!API_KEY) {
    console.error('BAITYNET_NETWORKS_API_KEY is missing in environment variables');
    return new NextResponse(
        JSON.stringify({ message: 'إعدادات النظام ناقصة: مفتاح API غير موجود' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY.trim(), // التأكد من عدم وجود مسافات
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
      cache: 'no-store'
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Baitynet API failed with status ${response.status}:`, errorText);
      return new NextResponse(
        JSON.stringify({ message: `خطأ من المصدر: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
            return NextResponse.json(data.data);
        } else {
            return new NextResponse(
                JSON.stringify({ message: 'تنسيق البيانات المستلمة غير صحيح' }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }
    } else {
        const text = await response.text();
        console.error("Provider returned non-JSON response (likely HTML error page):", text.substring(0, 300));
        return new NextResponse(
            JSON.stringify({ message: 'المزود أرسل استجابة غير صالحة (HTML بدلاً من JSON). يرجى التحقق من المفاتيح.' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('Baitynet Fetch Exception:', error);
    return new NextResponse(
        JSON.stringify({ message: 'حدث خطأ داخلي أثناء محاولة الاتصال بالمزود' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
