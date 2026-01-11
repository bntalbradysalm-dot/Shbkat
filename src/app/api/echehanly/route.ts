
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
       // Assuming the action for payment is 'bill-pay' based on the new structure
      endpointPath = '/bill-pay';
      break;
    case 'billoffer':
      endpointPath = '/bill-offer';
      break;
    case 'status':
       // Assuming status check endpoint
       endpointPath = '/bill-status';
       break;
    default:
      return new NextResponse(
        JSON.stringify({ message: `Invalid action: ${action}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
  }

  const endpoint = `${API_BASE_URL}${endpointPath}`;
  
  let body: any = {};
  if (request.method === 'POST') {
    try {
        // Since the original request might be GET, we parse params and build a body for POST
        const mobile = searchParams.get('mobile');
        const amount = searchParams.get('amount');
        const offerid = searchParams.get('offerid');
        const transid = searchParams.get('transid');

        if (mobile) body.mobile = mobile;

        if(action === 'bill') {
          if (amount) body.amount = amount;
        } else if (action === 'billoffer') {
          if (offerid) body.offerid = offerid;
        } else if (action === 'status') {
            if (transid) body.transid = transid;
        }

    } catch (e) {
      console.error("Could not parse request body", e);
    }
  }


  try {
    const fetchOptions: RequestInit = {
      method: 'POST', // The new API likely uses POST for all actions
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(body)
    };

    const response = await fetch(endpoint, fetchOptions);
    const data = await response.json();

    // Assuming the new API returns non-200 status for errors
    if (!response.ok) {
        const errorMessage = data?.message || data?.resultDesc || 'Failed to process request with the provider.';
        return new NextResponse(
            JSON.stringify({ message: errorMessage, ...data }),
            { status: response.status, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    // Adapt response for the frontend if necessary
    // Example: Old API had `amounts.amount1`, new might have `balance`
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

// Accept both GET and POST, but internally always POST to the new API
export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
