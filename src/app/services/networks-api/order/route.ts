
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE_URL = 'https://apis.baitynet.net/api/partner/orders';
const API_KEY = '677d3f8b-35a9-444b-b361-9e25c819e30a';

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();
    const { classId } = body;

    if (!classId) {
      return new NextResponse(JSON.stringify({ message: 'Class ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const externalApiBody = {
      data: {
        class: classId,
        user: { 
          identifier: "+967770326828", 
          password: "770326828moh" 
        },
      }
    };
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalApiBody),
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`External API failed with status: ${response.status}`, data);
      return new NextResponse(
        JSON.stringify({ message: data?.error?.message?.ar || 'Failed to create order' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in POST /services/networks-api/order:', error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
