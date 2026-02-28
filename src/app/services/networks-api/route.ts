
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EXTERNAL_API_URL = 'https://apis.baitynet.net/api/partner/networks';
const API_KEY = '677d3f8b-35a9-444b-b361-9e25c819e30a';

export async function GET() {
  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
      cache: 'no-store'
    });

    const data = await response.json();

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`External API failed with status: ${response.status}`, errorBody);
      return new NextResponse(
        `External API failed with status: ${response.status} ${errorBody}`,
        { status: response.status }
      );
    }
    
    if (data && Array.isArray(data.data)) {
        return NextResponse.json(data.data);
    } else {
        console.error('Unexpected data structure from external API:', data);
        return new NextResponse(
            'Unexpected data structure from external API.',
            { status: 500 }
        );
    }

  } catch (error) {
    console.error('Error fetching from external API:', error);
    return new NextResponse(
        'An internal server error occurred.',
        { status: 500 }
    );
  }
}
