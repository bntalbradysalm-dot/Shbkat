'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const API_BASE_URL = 'https://echehanly.yrbso.net';
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
  let body: any = {};
  try {
    body = await request.json();
    const { action, service, ...payload } = body;
    
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
    delete apiRequestBody.service;

    if (service === 'yem4g') {
        endpoint = '/api/yr/yem4g';
        apiRequestBody.action = action;
    } else { // Default to yemen mobile
        switch(action) {
            case 'query':
            case 'bill':
            case 'solfa':
            case 'queryoffer':
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
    }

    const params = new URLSearchParams(apiRequestBody);
    const fullUrl = `${API_BASE_URL}${endpoint}?${params.toString()}`;

    const response = await fetch(fullUrl, {
      method: 'GET', // echehanly uses GET
      headers: {
        // Content-Type is not needed for GET requests with URL params
      },
    });
    
    const responseText = await response.text();
    
    // Log the raw response text for debugging
    console.log(`[TELECOM API RESPONSE] Action: ${action}, Service: ${service || 'yem'}, Phone: ${payload.mobile}, Raw Text:`, responseText);

    try {
      const data = JSON.parse(responseText);
      if (!response.ok || (data.resultCode && data.resultCode !== "0" && data.resultCode !== "-2")) {
        const errorMessage = data.resultDesc || 'An unknown error occurred.';
        return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return NextResponse.json(data);
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      console.error('Response text from external API:', responseText);
      // Return the raw text from the server for better debugging.
      return new NextResponse(
        JSON.stringify({ message: `فشل تحليل استجابة الخادم. النص الخام من الخادم: "${responseText}"` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error(`Error in /api/telecom for action: ${body.action}:`, error);
    return new NextResponse(
      JSON.stringify({ message: `Internal Server Error: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
