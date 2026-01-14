
'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/query';
const API_KEY = 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, type, transid } = body;

    if (!mobile || !type) {
      return new NextResponse(JSON.stringify({ message: 'رقم الهاتف ونوع الاستعلام مطلوبان.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (type === 'status' && !transid) {
       return new NextResponse(JSON.stringify({ message: 'رقم العملية (transid) مطلوب لاستعلام الحالة.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const apiRequestBody = {
      data: {
        mobile: String(mobile),
        type: type,
        ...(type === 'status' && { transid: transid })
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
