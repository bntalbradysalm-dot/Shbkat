
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
      // If the external API call fails, log the error and return a server error status.
      const errorBody = await response.text();
      console.error(`External API failed with status: ${response.status}`, errorBody);
      return NextResponse.json(
        { error: 'Failed to fetch data from external provider.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // As per the documentation, the networks array is inside the 'data' property.
    // Check if the structure is as expected before returning.
    if (data && Array.isArray(data.data)) {
        return NextResponse.json(data.data);
    } else {
        // If the structure is not what we expect, log it and return an error.
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
