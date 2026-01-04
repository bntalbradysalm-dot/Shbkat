
import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.baitynet.net/api/partner/networks';
const API_KEY = '677d3f8b-35a9-444b-b361-9e25c819e30a';

export async function GET(
  request: Request,
  { params }: { params: { networkId: string } }
) {
  const networkId = params.networkId;

  if (!networkId) {
    return new NextResponse('Network ID is required', { status: 400 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${networkId}/classes`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`External API failed with status: ${response.status}`, data);
      // Forward the error message from the external API
      return new NextResponse(
        JSON.stringify({ message: data?.message?.ar || `External API failed` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // The external API returns an object with a 'data' property containing the array.
    if (data && Array.isArray(data.data)) {
        return NextResponse.json(data.data);
    } else {
        console.error('Unexpected data structure from external API:', data);
        return new NextResponse(
            JSON.stringify({ message: 'Unexpected data structure from external API.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error fetching from external API:', error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
