
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// These should be set in your .env.local file
const USERID = process.env.ECHENTELLY_USERID;
const USERNAME = process.env.ECHENTELLY_USERNAME;
const PASSWORD = process.env.ECHENTELLY_PASSWORD;
const DOMAIN = process.env.ECHENTELLY_DOMAIN;

function md5(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
}

function generateToken(transid: string, mobile: string): string {
    if (!PASSWORD || !USERNAME) {
        throw new Error("Missing username or password for token generation.");
    }
    const hashPassword = md5(PASSWORD);
    const token = md5(hashPassword + transid + USERNAME + mobile);
    return token;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service'); // e.g., 'yem', 'yem4g'
    const action = searchParams.get('action');
    const mobile = searchParams.get('mobile');
    const amount = searchParams.get('amount');
    const offerid = searchParams.get('offerid');
    const method = searchParams.get('method');
    const type = searchParams.get('type');

    if (!service || !action || !mobile) {
        return new NextResponse(JSON.stringify({ message: 'Service, action, and mobile number are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    if (!USERID || !USERNAME || !PASSWORD || !DOMAIN) {
        return new NextResponse(JSON.stringify({ message: 'Server is not configured for echehanly API' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    let apiUrl = `https://${DOMAIN}/api/yr/${service}?action=${action}&userid=${USERID}&mobile=${mobile}&transid=${transid}&token=${token}`;
    
    if (amount) apiUrl += `&amount=${amount}`;
    if (offerid) apiUrl += `&offerid=${offerid}`;
    if (method) apiUrl += `&method=${method}`;
    if (type) apiUrl += `&type=${type}`;


    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await apiResponse.json();

        // Check for specific error messages or non-zero resultCode
        if (!apiResponse.ok || (data.resultCode && data.resultCode !== "0")) {
            const description = data.resultDesc || `Failed to process request on echehanly API. Code: ${data.resultCode}`;
            
            // Check for specific known error phrases from the provider
            if (description.includes('لا يوجد رصيد') || description.includes('غير متاحة')) {
                return new NextResponse(JSON.stringify({ message: description }), { status: 400, headers: { 'Content-Type': 'application/json' } });
            }
            
            return new NextResponse(JSON.stringify({ message: description }), { status: apiResponse.status || 400, headers: { 'Content-Type': 'application/json' } });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Echehanly API request failed:", error);
        return new NextResponse(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}



