
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
  const type = searchParams.get('type'); // For Yemen Post (adsl/line) or Yemen 4G (1/2)

  if (!service || !action || !mobile) {
    return new NextResponse(
      JSON.stringify({ message: 'Missing required query parameters: service, action, mobile' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let endpoint = '';
  let requestBody: any = { data: { mobile: String(mobile) } };
  let method = 'POST';

  if (service === 'yem' && action === 'query') {
    endpoint = '/partner-yem/query';
    const queryType = searchParams.get('type'); // balance, solfa, offers, status
    if (!queryType) {
        return new NextResponse(JSON.stringify({ message: 'Missing type for query action' }), { status: 400 });
    }
    requestBody.data.type = queryType;
    if (queryType === 'status' && transid) {
        requestBody.data.transid = transid;
    }
  } else if (service === 'yem' && action === 'bill') {
    endpoint = '/partner-yem/bill';
    if (!amount) return new NextResponse(JSON.stringify({ message: 'Missing amount for bill action' }), { status: 400 });
    requestBody.data.amount = Number(amount);
  } else if (service === 'yem' && action === 'bill-offer') {
    endpoint = '/partner-yem/bill-offer';
    if (!offerid) return new NextResponse(JSON.stringify({ message: 'Missing offerID for bill-offer action' }), { status: 400 });
    if (!transid) return new NextResponse(JSON.stringify({ message: 'Missing transid for bill-offer action' }), { status: 400 });
    requestBody.data.offerID = offerid;
    requestBody.data.transid = transid;
  }
  // Keep other operators logic if any, for now only Yemen Mobile is updated as per docs
  else {
      // Fallback for old structure or other services not covered by new docs
      let legacyEndpoint = `/Eshehanly?service=${service}&action=${action}&mobile=${mobile}`;
      if (transid) legacyEndpoint += `&transid=${transid}`;
      if (amount) legacyEndpoint += `&amount=${amount}`;
      if (offerid) legacyEndpoint += `&offerid=${offerid}`;
      if (type) legacyEndpoint += `&type=${type}`;
      
      try {
          const legacyResponse = await fetch(`${API_BASE_URL_LEGACY}${legacyEndpoint}`);
          const legacyData = await legacyResponse.json();
          return NextResponse.json(legacyData);
      } catch (error) {
          console.error(`Legacy API call failed for service: ${service}`, error);
          return new NextResponse(JSON.stringify({ message: 'Legacy API call failed' }), { status: 500 });
      }
  }
  
  if (!endpoint) {
    return new NextResponse(JSON.stringify({ message: 'Invalid service or action combination' }), { status: 400 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: method,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    console.error(`Error in /api/echehanly for ${service}:`, error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Dummy legacy URL, replace if needed
const API_BASE_URL_LEGACY = 'https://yourapi.com';
