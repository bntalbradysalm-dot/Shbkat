
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
      // Optional: Add caching strategy if needed
      // next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      // Log the error for debugging on the server
      const errorBody = await response.text();
      console.error(`External API failed with status: ${response.status}`, errorBody);
      // Return a generic error to the client
      return NextResponse.json(
        { error: 'Failed to fetch data from external provider.' },
        { status: 502 } // Bad Gateway
      );
    }

    const data = await response.json();
    
    // According to the new documentation, the networks are in the 'data' property
    if (data && data.data) {
        return NextResponse.json(data.data);
    } else {
        // Handle cases where the structure is not as expected
        console.error('Unexpected data structure from external API:', data);
        return NextResponse.json(
            { error: 'Unexpected data structure from external API.' },
            { status: 500 }
        );
    }

  } catch (error) {
    console.error('Error fetching from external API:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}
