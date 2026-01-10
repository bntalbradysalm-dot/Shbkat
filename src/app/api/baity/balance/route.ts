'use client';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/query';
const API_KEY = '677d3f8b-35a9-444b-b361-9e25c819e30a';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, type, transid } = body.data;

    if (!mobile || !type) {
      return new NextResponse(JSON.stringify({ message: 'Mobile and type are required' }), { status: 400 });
    }
    
    if (type === 'status' && !transid) {
       return new NextResponse(JSON.stringify({ message: 'transid is required for status query' }), { status: 400 });
    }

    const apiResponse = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: body.data }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
        return new NextResponse(
            JSON.stringify({ message: data?.message?.ar || data?.message || 'Failed to query data' }),
            { status: apiResponse.status, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/baity/balance:', error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
