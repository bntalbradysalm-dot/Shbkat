
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const EXTERNAL_API_URL = 'https://apis.baitynet.net/api/partner/networks';
const API_KEY = process.env.BAITYNET_NETWORKS_API_KEY;

export async function GET() {
  try {
    if (!API_KEY) {
        throw new Error('BAITYNET_NETWORKS_API_KEY is not defined');
    }

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
      const errorText = JSON.stringify(data);
      console.error(`External API failed with status: ${response.status}`, errorText);
      return new NextResponse(
        JSON.stringify({ message: `External API failed: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (data && Array.isArray(data.data)) {
        return NextResponse.json(data.data);
    } else {
        console.error('Unexpected data structure from external API:', data);
        return new NextResponse(
            JSON.stringify({ message: 'Unexpected data structure from external API.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('Error fetching from external API:', error);
    return new NextResponse(
        JSON.stringify({ message: error.message || 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
