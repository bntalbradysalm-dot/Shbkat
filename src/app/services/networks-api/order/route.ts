
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE_URL = 'https://apis.baitynet.net/api/partner/orders';

export async function POST(
  request: Request
) {
  const API_KEY = process.env.BAITYNET_NETWORKS_API_KEY;
  const USER_IDENTIFIER = process.env.BAITYNET_NETWORKS_USER_PHONE;
  const USER_PASSWORD = process.env.BAITYNET_NETWORKS_USER_PASS;

  try {
    const body = await request.json();
    const { classId } = body;

    if (!classId) {
      return new NextResponse(JSON.stringify({ message: 'Class ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!API_KEY || !USER_IDENTIFIER || !USER_PASSWORD) {
        return new NextResponse(JSON.stringify({ message: 'Config missing' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const externalApiBody = {
      data: {
        class: classId,
        user: { 
          identifier: USER_IDENTIFIER.trim(), 
          password: USER_PASSWORD.trim()
        },
      }
    };
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(externalApiBody),
      cache: 'no-store'
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Order creation failed with status: ${response.status}`, errorText);
      return new NextResponse(
        JSON.stringify({ message: `Order Error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (contentType.includes("application/json")) {
        const data = await response.json();
        return NextResponse.json(data);
    } else {
        const text = await response.text();
        console.error("Order response is not JSON:", text.substring(0, 300));
        return new NextResponse(
            JSON.stringify({ message: 'Invalid order response from provider' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('Error in order route:', error);
    return new NextResponse(
        JSON.stringify({ message: error.message || 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
