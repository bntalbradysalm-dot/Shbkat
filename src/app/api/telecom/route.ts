'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const API_BASE_URL = 'https://echehanlyw.yrbso.net';
const USERID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

// Function to generate the required token
const generateToken = (transid: string, mobile: string) => {
  const hashPassword = CryptoJS.MD5(PASSWORD).toString();
  const token = CryptoJS.MD5(hashPassword + transid + USERNAME + mobile).toString();
  return token;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;
    
    if (!payload.mobile) {
        return new NextResponse(JSON.stringify({ message: 'رقم الهاتف مطلوب.' }), { status: 400 });
    }

    const transid = Date.now().toString();
    const token = generateToken(transid, payload.mobile);

    let endpoint = '/yem?';
    let apiRequestBody: any = {
      action,
      userid: USERID,
      transid,
      token,
      ...payload
    };
    
    // Use the correct endpoint for offer activation
    if (action === 'billover') {
        endpoint = '/yem?';
    }


    const url = `${API_BASE_URL}${endpoint}${new URLSearchParams(apiRequestBody)}`;

    const response = await fetch(url, {
      method: 'GET', // echehanly uses GET
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.resultCode !== "0") {
      const errorMessage = data.resultDesc || 'An unknown error occurred.';
      return new NextResponse(JSON.stringify({ message: errorMessage }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error(`Error in /api/telecom for action:`, error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
