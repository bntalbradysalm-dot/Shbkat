'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem';
const API_KEY = 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    let endpoint = '';
    let apiRequestBody: any;

    switch (action) {
      case 'pay-bill':
        endpoint = '/bill-balance';
        // The user specified the body should contain both mobile and amount
        apiRequestBody = { data: { mobile: payload.mobile, amount: payload.amount } };
        break;
      
      case 'get-balance':
        endpoint = '/bill-balance'; // This endpoint is used for both getting balance and paying
        // For getting balance, only mobile number is needed
        apiRequestBody = { data: { mobile: payload.mobile } };
        break;

      default:
        return new NextResponse(JSON.stringify({ message: 'Invalid action provided.' }), { status: 400 });
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequestBody),
    });

    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data?.message?.ar || data?.message || data?.resultDesc || 'An unknown error occurred.';
        return new NextResponse(JSON.stringify({ message: errorMessage }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error(`Error in /api/telecom for action:`, error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
