
import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = 'https://apis.okamel.org/api/partner/networks';
const API_KEY = '3613abd0-1510-45b3-a4a9-9a25028186a8';

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
        `External API failed with status: ${response.status} ${errorBody}`,
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // The external API returns an object with a 'data' property containing the array.
    // We need to extract this array and return it.
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
