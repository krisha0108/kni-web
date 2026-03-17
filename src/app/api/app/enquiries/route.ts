import { NextResponse } from "next/server";

/**
 * Enquiry endpoints removed — feature was legacy and unused.
 * RequestDetail screen (which used this) has been removed from navigation.
 */

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "This feature has been removed" },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "This feature has been removed" },
    { status: 410 }
  );
}
