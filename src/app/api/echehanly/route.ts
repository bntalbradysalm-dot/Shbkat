
import { NextResponse } from 'next/server';
import md5 from 'crypto-js/md5';

const API_BASE_URL = 'https://echehanly.yrbso.net/api/yr/yem';
const USER_ID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

function generateToken(transid: string, mobile: string) {
  const hashPassword = md5(PASSWORD).toString();
  const token = md5(hashPassword + transid + USERNAME + mobile).toString();
  return token;
}

async function handleRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const mobile = searchParams.get('mobile');
  
  if (!action || !mobile) {
    return new NextResponse(
      JSON.stringify({ message: 'Missing required query parameters: action, mobile' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const transid = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const token = generateToken(transid, mobile);
  
  const endpoint = new URL(API_BASE_URL);
  endpoint.searchParams.append('action', action);
  endpoint.searchParams.append('userid', USER_ID);
  endpoint.searchParams.append('mobile', mobile);
  
  // Use original transid if provided for follow-up actions like bill-offer
  const originalTransid = searchParams.get('transid');
  if (originalTransid) {
    endpoint.searchParams.append('transid', originalTransid);
    endpoint.searchParams.set('token', generateToken(originalTransid, mobile));
  } else {
    endpoint.searchParams.append('transid', transid);
    endpoint.searchParams.append('token', token);
  }

  // Add parameters specific to certain actions
  if (action === 'query') {
    const type = searchParams.get('type');
    if (type) endpoint.searchParams.append('type', type);
  } else if (action === 'bill') {
    const amount = searchParams.get('amount');
    if (amount) endpoint.searchParams.append('amount', amount);
  } else if (action === 'billoffer') {
    const offerid = searchParams.get('offerid');
    if (offerid) endpoint.searchParams.append('offerid', offerid);
  }
  
  try {
    const fetchOptions: RequestInit = {
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' },
    };

    const response = await fetch(endpoint.toString(), fetchOptions);
    const data = await response.json();

    if (data.resultCode !== "0" && !String(data.resultCode).startsWith("10")) {
        const errorMessage = data?.resultDesc || data?.message || 'Failed to process request with the provider.';
        return new NextResponse(
            JSON.stringify({ message: errorMessage, ...data }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    // The API might return a new transid for bill payments, pass it back
    if (action === 'bill' && data.sequenceId) {
        data.transid = data.sequenceId;
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

