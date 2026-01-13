'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://echehanly.com/api/v1';
const API_KEY = 'YT92511';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    let endpoint = '';
    let apiRequestBody: any = {
      ...payload,
      token: API_KEY,
    };
    let url = '';

    switch (action) {
      case 'pay-bill':
        endpoint = '/yem?';
        url = `${API_BASE_URL}${endpoint}${new URLSearchParams(apiRequestBody)}`;
        break;
      
      case 'get-balance':
         endpoint = '/yem?';
         apiRequestBody.type = 'balance';
         url = `${API_BASE_URL}${endpoint}${new URLSearchParams(apiRequestBody)}`;
        break;

      case 'query':
         endpoint = '/yem?';
         url = `${API_BASE_URL}${endpoint}${new URLSearchParams(apiRequestBody)}`;
         break;

      default:
        return new NextResponse(JSON.stringify({ message: 'Invalid action provided.' }), { status: 400 });
    }

    const response = await fetch(url, {
      method: 'GET', // echehanly uses GET
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const textData = await response.text();
    try {
        const data = JSON.parse(textData);
         if (!response.ok) {
            const errorMessage = data?.resultDesc || data?.message?.ar || data?.message || 'An unknown error occurred.';
            return new NextResponse(JSON.stringify({ message: errorMessage }), {
              status: response.status,
              headers: { 'Content-Type': 'application/json' },
            });
        }
        return NextResponse.json(data);
    } catch(e) {
        // Handle non-JSON responses from echehanly
        if (!response.ok) {
            return new NextResponse(JSON.stringify({ message: textData }), {
              status: response.status,
              headers: { 'Content-Type': 'application/json' },
            });
        }
        return NextResponse.json({ message: textData });
    }

  } catch (error: any) {
    console.error(`Error in /api/telecom for action:`, error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
