
import { NextResponse } from 'next/server';
import md5 from 'crypto-js/md5';

const API_BASE_URL = 'https://echehanly.yrbso.net/api/yr';
const USER_ID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

// Helper function to generate the required token
function generateToken(transid: string, mobile: string) {
  const hashPassword = md5(PASSWORD).toString();
  const token = md5(hashPassword + transid + USERNAME + mobile).toString();
  return token;
}

async function handleRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const service = searchParams.get('service'); // yem, sab, mtn, etc.
  const action = searchParams.get('action'); // query, bill, etc.
  const mobile = searchParams.get('mobile');
  
  if (!service || !action || !mobile) {
    return new NextResponse(
      JSON.stringify({ message: 'Missing required query parameters: service, action, mobile' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Use a more unique transaction ID
  const transid = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const token = generateToken(transid, mobile);
  
  const endpoint = new URL(`${API_BASE_URL}/${service}`);
  endpoint.searchParams.append('action', action);
  endpoint.searchParams.append('userid', USER_ID);
  endpoint.searchParams.append('mobile', mobile);
  endpoint.searchParams.append('transid', transid);
  endpoint.searchParams.append('token', token);

  // Add parameters specific to certain actions
  if (action === 'query') {
    const type = searchParams.get('type');
    if (type) {
      endpoint.searchParams.append('type', type);
    }
  } else if (action === 'bill') {
    const amount = searchParams.get('amount');
    if (amount) {
      endpoint.searchParams.append('amount', amount);
    }
  } else if (action === 'bill-offer') {
    const offerid = searchParams.get('offerid');
    if (offerid) {
        endpoint.searchParams.append('offerid', offerid);
    }
    // The transid for bill-offer should come from the initial bill payment
    const originalTransid = searchParams.get('original_transid');
    if (originalTransid) {
        endpoint.searchParams.set('transid', originalTransid);
        // Re-generate token with the original transid
        endpoint.searchParams.set('token', generateToken(originalTransid, mobile));
    }
  }
  
  try {
    const fetchOptions: RequestInit = {
      method: 'GET', // The API uses GET for all operations
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(endpoint.toString(), fetchOptions);
    const data = await response.json();

    // The API returns resultCode "0" for success
    if (data.resultCode !== "0") {
        const errorMessage = data?.resultDesc || data?.message || 'Failed to process the request with the provider.';
        return new NextResponse(
            JSON.stringify({ message: errorMessage, ...data }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
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

// The API uses GET, so we only need the GET handler.
export async function GET(request: Request) {
  return handleRequest(request);
}

// We can keep POST for compatibility in case frontend components still use it,
// but it will just be passed to the GET handler.
export async function POST(request: Request) {
    return handleRequest(request);
}
