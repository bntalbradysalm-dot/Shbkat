
'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/bill-balance';
const API_KEY = process.env.BAITYNET_BALANCE_API_KEY;
const AUTH_TOKEN = process.env.BAITYNET_BALANCE_AUTH_TOKEN;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!API_KEY || !AUTH_TOKEN) {
        throw new Error('Okamel Balance configuration is missing in environment variables');
    }

    const externalApiBody = {
      data: body
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(externalApiBody)
    });

    const result = await response.json();

    if (!response.ok) {
        return new NextResponse(
            JSON.stringify({ message: result.message || 'فشلت العملية من المصدر.' }),
            { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`Error in /api/baitynet:`, error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
