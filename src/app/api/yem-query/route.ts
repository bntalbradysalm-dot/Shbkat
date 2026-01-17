
'use server';

import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem/query';
const API_KEY = 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // The request from the frontend will be { mobile, type }
    // The external API expects { data: { mobile, type } }
    const externalApiBody = {
      data: body
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(externalApiBody)
    });

    const result = await response.json();

    if (!response.ok) {
        // Forward the error from the external API, including details
        console.error("External API error from /api/yem-query:", result);
        return new NextResponse(
            JSON.stringify({ message: result.message || 'فشل الاستعلام من المصدر.', details: result }),
            { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error(`Error in /api/yem-query:`, error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
