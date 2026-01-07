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

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    if (!USERID || !USERNAME || !PASSWORD || !DOMAIN) {
        return new NextResponse(JSON.stringify({ message: 'Server is not configured for echehanly API' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    // For games, mobile and transid can be static/dummy values as per similar APIs
    const transid = Date.now().toString();
    const mobile = '777777777'; 
    const token = generateToken(transid, mobile);

    let apiUrl = `https://${DOMAIN}/api/yr/gameswcards?userid=${USERID}&mobile=${mobile}&transid=${transid}&token=${token}`;

    try {
        const apiResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok || (data.resultCode && data.resultCode !== "0")) {
            const description = data.resultDesc || `Failed to process request on games API. Code: ${data.resultCode}`;
            return new NextResponse(JSON.stringify({ message: description }), { status: apiResponse.status || 400, headers: { 'Content-Type': 'application/json' } });
        }

        if (data && Array.isArray(data.games)) {
            return NextResponse.json(data.games);
        }

        return NextResponse.json([]);

    } catch (error) {
        console.error("Games API request failed:", error);
        return new NextResponse(JSON.stringify({ message: 'An internal server error occurred.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
