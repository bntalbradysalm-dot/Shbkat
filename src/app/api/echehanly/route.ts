
import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api';
const API_KEY = process.env.BAITY_API_KEY || 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service');
  const action = searchParams.get('action');
  const mobile = searchParams.get('mobile');
  const transid = searchParams.get('transid');
  const amount = searchParams.get('amount');
  const offerid = searchParams.get('offerid');
  const type = searchParams.get('type'); 

  if (!service || !mobile) {
    return new NextResponse(
      JSON.stringify({ message: 'Missing required query parameters: service, mobile' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let endpoint = '';
  let requestBody: any = { data: { mobile: String(mobile) } };
  let method = 'POST';

  if (action === 'query') {
    endpoint = '/partner-yem/query';
    if (!type) {
        return new NextResponse(JSON.stringify({ message: 'Missing type for query action' }), { status: 400 });
    }
    requestBody.data.type = type;
    if (type === 'status' && transid) {
        requestBody.data.transid = transid;
    }
  } else if (action === 'bill') {
    endpoint = '/partner-yem/bill-balance';
    if (!amount) return new NextResponse(JSON.stringify({ message: 'Missing amount for bill action' }), { status: 400 });
    requestBody.data.amount = Number(amount);
  } else if (action === 'bill-offer') {
    endpoint = '/partner-yem/bill-offer';
    if (!offerid) return new NextResponse(JSON.stringify({ message: 'Missing offerID for bill-offer action' }), { status: 400 });
    if (!transid) return new NextResponse(JSON.stringify({ message: 'Missing transid for bill-offer action' }), { status: 400 });
    requestBody.data.offerID = offerid;
    requestBody.data.transid = transid;
  }
   else if (service === 'info' && action === 'status') {
    endpoint = `/partner-yem/status/${transid}`;
    method = 'GET';
    requestBody = undefined;
  }
  else {
      // Fallback for other services if any, though the main ones are handled above.
      return new NextResponse(JSON.stringify({ message: 'Invalid or unsupported action' }), { status: 400 });
  }
  
  if (!endpoint) {
    return new NextResponse(JSON.stringify({ message: 'Invalid service or action combination' }), { status: 400 });
  }

  try {
    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST') {
        fetchOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

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
    console.error(`Error in /api/echehanly for ${service}:`, error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

