
'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://api.baitynet.com/partner-yem/query';
const API_KEY = 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile } = body;

    if (!mobile) {
      return new NextResponse(JSON.stringify({ message: 'رقم الهاتف مطلوب.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const apiRequestBody = {
      data: {
        mobile: String(mobile),
        type: 'balance' 
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
       const errorMessage = data?.error?.message || 'فشلت عملية الاستعلام من المصدر.';
       return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in /api/yem-query:', error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
