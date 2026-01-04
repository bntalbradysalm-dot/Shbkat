
import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = 'https://shabakat.vercel.app/api/partner/networks';
const API_KEY = '942a16cf-adfd-4770-803c-ab0d6f26091b';

export async function GET() {
  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      // Optional: Add caching strategy if needed
      // next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      // Log the error for debugging on the server
      console.error(`External API failed with status: ${response.status}`);
      // Return a generic error to the client
      return NextResponse.json(
        { error: 'Failed to fetch data from external provider.' },
        { status: 502 } // Bad Gateway
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching from external API:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
