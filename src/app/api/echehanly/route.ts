
import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://apis.okamel.org/api/partner-yem';
const API_KEY = 'fb845cb5-b835-4d88-8c8e-eb28cc38a2f2';

async function handleRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!action) {
    return new NextResponse(
      JSON.stringify({ message: 'Missing required query parameter: action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Define endpoint path based on action
  let endpointPath = '';
  switch (action) {
    case 'query':
      endpointPath = '/bill-balance';
      break;
    case 'bill':
      endpointPath = '/bill-pay';
      break;
    case 'billoffer':
      endpointPath = '/bill-offer';
      break;
    case 'status':
       endpointPath = '/bill-status';
       break;
    default:
      return new NextResponse(
        JSON.stringify({ message: `Invalid action: ${action}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
  }

  const endpoint = `${API_BASE_URL}${endpointPath}`;
  
  let requestData: any = {};
  try {
      const mobile = searchParams.get('mobile');
      const amount = searchParams.get('amount');
      const offerid = searchParams.get('offerid');
      const transid = searchParams.get('transid');

      if (mobile) requestData.mobile = mobile;

      if(action === 'bill') {
        if (amount) requestData.amount = amount;
      } else if (action === 'billoffer') {
        if (offerid) requestData.offerID = offerid; // Match user's example
        // Add other potential fields from user example if needed
        // requestData.method = "1";
        // requestData.packageId = 36;
      } else if (action === 'status') {
          if (transid) requestData.transid = transid;
      }

  } catch (e) {
    console.error("Could not parse request query params", e);
  }

  // Wrap the collected data into the required {"data": {...}} structure
  const body = {
    data: requestData
  };


  try {
    const fetchOptions: RequestInit = {
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(body)
    };

    const response = await fetch(endpoint, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
        const errorMessage = data?.message || data?.resultDesc || 'Failed to process request with the provider.';
        return new NextResponse(
            JSON.stringify({ message: errorMessage, ...data }),
            { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    if (action === 'query' && data.balance) {
        data.amounts = { amount1: data.balance };
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error(`Error in /api/echehanly for action ${action}:`, error);
    return new NextResponse(
        JSON.stringify({ message: 'An internal server error occurred.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
