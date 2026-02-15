import { NextResponse } from "next/server";

/**
 * API للفئات الرسمية المعتمدة لمنظومة الوادي
 */
export async function GET() {
  const categories = [
    { id: 1, name: "شهرين", price: 3000, duration_months: 2 },
    { id: 3, name: "4 أشهر", price: 6000, duration_months: 4 },
    { id: 7, name: "6 أشهر", price: 9000, duration_months: 6 },
    { id: 9, name: "سنة", price: 15000, duration_months: 12 }
  ];

  return NextResponse.json({
    success: true,
    count: categories.length,
    data: categories
  });
}
