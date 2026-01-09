import { NextResponse } from 'next/server';
import crypto from 'crypto';

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

export async function POST(request: Request) {
    const { customerId, placeId, action, type } = await request.json(); // Added type

    if (!USERID || !USERNAME || !PASSWORD || !DOMAIN) {
        return new NextResponse(JSON.stringify({ message: 'Server is not configured for echehanly API' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (!customerId || !placeId || !action || !type) {
        return new NextResponse(JSON.stringify({ message: 'Customer ID, Place ID, action, and type are required' }), { status: 400 });
    }

    const transid = Date.now().toString();
    const token = generateToken(transid, customerId);

    const apiUrl = `https://${DOMAIN}/api/yr/electwater?userid=${USERID}&mobile=${customerId}&transid=${transid}&token=${token}&action=query&act=${type}`;

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'userid': customerId,
                'placeid': placeId,
            }),
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok || (data.resultCode && data.resultCode !== "0")) {
            const description = data.resultDesc || `Failed to process request on electwater API. Code: ${data.resultCode}`;
            return new NextResponse(JSON.stringify({ message: description }), { status: apiResponse.status || 400 });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Electricity/Water API request failed:", error);
        return new NextResponse(JSON.stringify({ message: 'An internal server error occurred.' }), { status: 500 });
    }
}
