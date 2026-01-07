
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
    const action = searchParams.get('action');
    const mobile = searchParams.get('mobile');
    const amount = searchParams.get('amount'); // For 'bill' action

    if (!action || !mobile) {
        return new NextResponse(JSON.stringify({ message: 'Action and mobile number are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'bill' && !amount) {
        return new NextResponse(JSON.stringify({ message: 'Amount is required for bill action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!USERID || !USERNAME || !PASSWORD || !DOMAIN) {
        return new NextResponse(JSON.stringify({ message: 'Server is not configured for echehanly API' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    let apiUrl = `https://${DOMAIN}/yem?action=${action}&userid=${USERID}&mobile=${mobile}&transid=${transid}&token=${token}`;
    if (action === 'bill' && amount) {
        apiUrl += `&amount=${amount}`;
    }

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!apiResponse.ok) {
            // If the external API itself fails (e.g., 500), this will be caught here.
            return new NextResponse(JSON.stringify({ message: `External API request failed with status ${apiResponse.status}` }), { status: apiResponse.status, headers: { 'Content-Type': 'application/json' } });
        }

        const data = await apiResponse.json();
        
        // Echehanly API uses `resultCode` to indicate success/failure in the response body.
        if (data.resultCode !== "0") {
             // Forward the error from the external API's response body.
             return new NextResponse(JSON.stringify({ message: data.resultDesc || 'Failed to process request on echehanly API' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Echehanly API request failed:", error);
        return new NextResponse(JSON.stringify({ message: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
