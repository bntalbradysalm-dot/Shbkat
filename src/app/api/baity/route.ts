'use client';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem';
const API_KEY = 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

async function proxyRequest(endpoint: string, payload: any) {
  try {
    // The external API expects the body to be { "data": { ... } }
    const requestBody = {
      data: payload
    };

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
        // Forward the actual error message from the external API if available
        const errorMessage = data?.message?.ar || data?.message || `API Error: ${response.statusText}`;
        return new NextResponse(
            JSON.stringify({ message: errorMessage }),
            { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error(`Error in proxying to ${endpoint}:`, error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
    const body = await request.json();
    const { endpoint, payload } = body;

    if (!endpoint || !payload) {
        return new NextResponse(JSON.stringify({ message: 'Endpoint and payload are required' }), { status: 400 });
    }

    // The endpoint from the client will be like 'query', 'bill-balance', 'bill-offer'.
    // We proxy the request to the correct full external URL.
    return proxyRequest(endpoint, payload);
}
