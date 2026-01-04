import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner/orders';
const API_KEY = '3613abd0-1510-45b3-a4a9-9a25028186a8';

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
