import { NextResponse } from "next/server";
import { db } from "@/server/db";

// GET - Fetch active payment settings (Public - no auth required)
// This endpoint is public so owners can see QR code during payment
export async function GET() {
  try {
    const settings = await db.paymentSettings.findFirst({
      where: { isActive: true },
      select: {
        qrCodeImageUrl: true,
        upiId: true,
        accountHolderName: true,
        instructions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!settings) {
      return NextResponse.json(
        { ok: false, error: "Payment settings not configured" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    console.error("Get public payment settings error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}
