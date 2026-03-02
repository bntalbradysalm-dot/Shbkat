
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_BASE_URL = 'https://apis.baitynet.net/api/partner/networks';
const API_KEY = process.env.BAITYNET_NETWORKS_API_KEY;

export async function GET(
  request: Request,
  { params }: { params: { networkId: string } }
) {
  const networkId = params.networkId;

  if (!networkId) {
    return new NextResponse('Network ID is required', { status: 400 });
  }

  try {
    if (!API_KEY) {
        return new NextResponse(
            JSON.stringify({ message: 'BAITYNET_NETWORKS_API_KEY is missing' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const response = await fetch(`${API_BASE_URL}/${networkId}/classes`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
      cache: 'no-store'
    });

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`External API failed with status: ${response.status}`, errorText);
      return new NextResponse(
        JSON.stringify({ message: `API Error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
            return NextResponse.json(data.data);
        } else {
            return new NextResponse(
                JSON.stringify({ message: 'Invalid classes format from provider' }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }
    } else {
        const text = await response.text();
        console.error("Received non-JSON response for classes:", text);
        return new NextResponse(
            JSON.stringify({ message: 'Invalid response from provider' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: any) {
    console.error('Error fetching classes:', error);
    return new NextResponse(
        JSON.stringify({ message: error.message || 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
