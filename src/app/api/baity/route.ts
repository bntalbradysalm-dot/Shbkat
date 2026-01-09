import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/bill-balance';
// It's better to store keys in environment variables
const API_KEY = process.env.BAITY_API_KEY || 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, amount } = body;

    if (!mobile || !amount) {
      return new NextResponse(JSON.stringify({ message: 'Mobile number and amount are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const externalApiBody = {
      data: {
        mobile: String(mobile),
        amount: Number(amount),
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
      // Try to extract a meaningful error message from the external API's response
      const errorMessage = data?.message || data?.error?.message || 'Failed to process the request with the provider.';
      return new NextResponse(
        JSON.stringify({ message: errorMessage }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Assuming the success response has a certain structure, forward it
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/baity route:', error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
