'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/bill-balance';
// It's better to store API keys in environment variables, but for now, we'll use it directly.
const API_KEY = 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, amount } = body;

    if (!mobile || !amount) {
      return new NextResponse(JSON.stringify({ message: 'البيانات المطلوبة غير مكتملة (رقم الهاتف، المبلغ).' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const apiRequestBody = {
      data: {
        mobile: String(mobile),
        amount: Number(amount),
      },
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(apiRequestBody),
    });

    const data = await response.json();

    if (!response.ok) {
       const errorMessage = data?.error?.message || 'فشلت عملية السداد من المصدر.';
       return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Assuming a successful response from baitynet also needs to be returned
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in /api/baitynet:', error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
