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

    const transid = payload.transid || Date.now().toString();
    const token = generateToken(transid, payload.mobile);

    let endpoint = '';
    let apiRequestBody: any = {
      userid: USERID,
      username: USERNAME,
      transid,
      token,
      ...payload
    };
    
    delete apiRequestBody.action;

    switch(action) {
        case 'query':
        case 'queryoffer':
        case 'solfa':
        case 'bill':
            endpoint = '/yem';
            apiRequestBody.action = action;
            break;
        case 'billover':
            endpoint = '/offeryem';
            apiRequestBody.action = action;
            break;
        case 'status':
            endpoint = '/info';
            apiRequestBody.action = action;
            break;
        default:
            return new NextResponse(JSON.stringify({ message: 'Invalid action' }), { status: 400 });
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const params = new URLSearchParams(apiRequestBody);
    const fullUrl = `${url}?${params.toString()}`;

    const response = await fetch(fullUrl, {
      method: 'GET', // echehanly uses GET
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok || (data.resultCode && data.resultCode !== "0")) {
      const errorMessage = data.resultDesc || 'An unknown error occurred.';
      return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error(`Error in /api/telecom for action:`, error);
    // Check if the error is a JSON parsing error
    if (error instanceof SyntaxError && error.message.includes("Unexpected token")) {
       return new NextResponse(
        JSON.stringify({ message: 'فشل الخادم في الاستجابة بشكل صحيح. قد يكون هناك ضغط على الشبكة.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
