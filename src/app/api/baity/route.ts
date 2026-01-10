'use client';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem';
const API_KEY = '677d3f8b-35a9-444b-b361-9e25c819e30a';

async function proxyRequest(endpoint: string, body: any) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
        return new NextResponse(
            JSON.stringify({ message: data?.message?.ar || data?.message || `API Error: ${response.statusText}` }),
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

    return proxyRequest(endpoint, payload);
}
