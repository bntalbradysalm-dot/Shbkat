'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/bill-balance';
// It's better to store API keys in environment variables, but for now, we'll use it directly.
const API_KEY = '677d3f8b-35a9-444b-b361-9e25c819e30a';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, amount, type } = body;

    if (!mobile || !amount || !type) {
      return new NextResponse(JSON.stringify({ message: 'البيانات المطلوبة غير مكتملة (رقم الهاتف، المبلغ، النوع).' }), { status: 400 });
    }

    const apiRequestBody = {
      data: {
        mobile,
        amount: Number(amount),
        type,
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
