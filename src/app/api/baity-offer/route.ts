'use client';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/bill-offer';
const API_KEY = '677d3f8b-35a9-444b-b361-9e25c819e30a';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, offerID, transid } = body.data;

    if (!mobile || !offerID || !transid) {
      return new NextResponse(JSON.stringify({ message: 'Missing required fields: mobile, offerID, transid' }), { status: 400 });
    }

    const externalApiBody = {
      data: { mobile, offerID, transid }
    };
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalApiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return new NextResponse(
        JSON.stringify({ message: data?.message?.ar || 'Failed to activate offer' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/baity-offer:', error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
