
import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/bill-offer';
const API_KEY = process.env.BAITY_API_KEY || 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, offerID } = body;

    if (!mobile || !offerID) {
      return new NextResponse(JSON.stringify({ message: 'Mobile number and offerID are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const externalApiBody = {
      data: {
        mobile: String(mobile),
        offerID: String(offerID),
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
      const errorMessage = data?.message || data?.error?.message || 'Failed to process the request with the provider.';
      return new NextResponse(
        JSON.stringify({ message: errorMessage }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/baity-offer route:', error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
