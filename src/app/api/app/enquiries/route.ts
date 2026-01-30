import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";

/**
 * POST /api/app/enquiries
 * Submit an enquiry from mobile app
 * NOTE: Enquiry model is not implemented yet - returns mock success
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { name, phone } = body;

    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get("owner_id") || session?.id;

    if (!name || !phone) {
      return NextResponse.json(
        { ok: false, error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // TODO: Implement Enquiry model in schema
    // For now, return mock success
    console.log("Enquiry submitted (mock):", { name, phone, ownerId });

    return NextResponse.json({
      ok: true,
      message: "Enquiry submitted successfully",
      data: {
        id: "enq-" + Date.now(),
        status: "pending",
      },
    });
  } catch (error: unknown) {
    console.error("Submit enquiry error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to submit enquiry" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/app/enquiries
 * Get enquiries for an owner
 * NOTE: Enquiry model is not implemented yet - returns empty array
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Implement Enquiry model in schema
    // For now, return empty array
    return NextResponse.json({
      ok: true,
      data: [],
    });
  } catch (error: unknown) {
    console.error("Get enquiries error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to get enquiries" },
      { status: 500 }
    );
  }
}
