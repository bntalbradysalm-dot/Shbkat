
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
  
  const transid = searchParams.get('transid') || Date.now().toString();
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
  }
  
  try {
    const fetchOptions: RequestInit = {
      method: 'GET', // The new API seems to use GET for all operations
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(endpoint.toString(), fetchOptions);
    const data = await response.json();

    if (data.resultCode !== "0") {
        const errorMessage = data?.resultDesc || 'Failed to process the request with the provider.';
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

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
    // The new API uses GET, so we just pass it to the GET handler.
    // We keep POST for compatibility in case frontend components still use it.
    return handleRequest(request);
}
