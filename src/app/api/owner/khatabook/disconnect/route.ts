import { NextRequest, NextResponse } from "next/server";
import { requireOwnerMobile } from "@/server/auth/rbac";
import { disconnectKhatabook } from "@/server/khatabook/service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwnerMobile(request);

    // Disconnect Khatabook
    await disconnectKhatabook(session.id);

    return NextResponse.json({
      ok: true,
      message: "Khatabook disconnected successfully",
    });
  } catch (error: any) {
    console.error("Disconnect Khatabook error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Internal server error",
      },
      { status: error.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
