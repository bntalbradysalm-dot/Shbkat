
import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = 'https://apis.okamel.org/api/partner/networks';
const API_KEY = '942a16cf-adfd-4770-803c-ab0d6f26091b';

export async function GET() {
  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`External API failed with status: ${response.status}`, errorBody);
      return new NextResponse(
        `External API failed with status: ${response.status}`,
        { status: response.status }
      );
    }

    const data = await response.json();
    
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
