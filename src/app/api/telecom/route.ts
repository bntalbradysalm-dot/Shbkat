'use server';

import { NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const USERID = '23207';
const USERNAME = '770326828';
const PASSWORD = '770326828moh';

// Function to generate the required token based on the documentation:
// hashPassword = md5(Password);
// token = md5(hashPassword + transid + Username + mobile);
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

    // Ensure transid is unique and not too long
    const transid = payload.transid || Date.now().toString().slice(-8);
    const token = generateToken(transid, payload.mobile);

    let endpoint = '';
    let apiBaseUrl = ''; 
    
    // Construct the base request body with ONLY required parameters according to docs
    let apiRequestParams: any = {
      action: action,
      userid: USERID,
      transid: transid,
      token: token,
      ...payload
    };
    
    // Remove service from params as it's internal to our app
    delete apiRequestParams.service;

    // Route to correct Domain and Endpoint based on service type
    if (service === 'yem4g') {
        apiBaseUrl = 'https://echehanly.yrbso.net';
        endpoint = '/api/yr/'; 
    } else { // Default to Yemen Mobile (yem)
        apiBaseUrl = 'https://echehanlyw.yrbso.net';
        switch(action) {
            case 'query':
            case 'bill':
            case 'solfa':
            case 'queryoffer':
                endpoint = '/yem';
                break;
            case 'billover':
                endpoint = '/offeryem';
                break;
            case 'status':
            case 'balance':
                endpoint = '/info';
                break;
            default:
                return new NextResponse(JSON.stringify({ message: 'الإجراء المطلوب غير صالح.' }), { status: 400 });
        }
    }

    const params = new URLSearchParams(apiRequestParams);
    const fullUrl = `${apiBaseUrl}${endpoint}?${params.toString()}`;

    // Use a timeout to prevent hanging requests
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
            },
        });
        
        clearTimeout(id);
        const responseText = await response.text();
        
        console.log(`[TELECOM API] URL: ${fullUrl}`);
        console.log(`[TELECOM API RESPONSE] Raw:`, responseText);

        const data = JSON.parse(responseText);
        
        // Success codes based on docs
        const isSuccess = data.resultCode === "0";
        const isPending = data.resultCode === "-2" || (data.resultDesc && data.resultDesc.includes('under process'));

        if (!response.ok || (data.resultCode && !isSuccess && !isPending)) {
            const errorMessage = data.resultDesc || 'حدث خطأ في الخادم الخارجي.';
            return new NextResponse(JSON.stringify({ message: errorMessage, ...data }), {
                status: response.status === 200 ? 400 : response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        return NextResponse.json(data);

    } catch (fetchError: any) {
        clearTimeout(id);
        if (fetchError.name === 'AbortError') {
            return new NextResponse(JSON.stringify({ message: 'انتهت مهلة الاتصال بالخادم الخارجي.' }), { status: 504 });
        }
        throw fetchError;
    }

  } catch (error: any) {
    console.error(`Error in /api/telecom:`, error);
    return new NextResponse(
      JSON.stringify({ message: `خطأ في الاتصال بالخدمة: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
