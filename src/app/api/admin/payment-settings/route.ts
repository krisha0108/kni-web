import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";
import { z } from "zod";

// Validation schema
const paymentSettingsSchema = z.object({
  qrCodeImageUrl: z.string().min(1, "QR code image URL is required"),
  upiId: z.string().min(1, "UPI ID is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  instructions: z.string().optional(),
});

// GET - Fetch current payment settings (Admin only)
export async function GET() {
  try {
    await requireAdmin();

    const settings = await db.paymentSettings.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    console.error("Get payment settings error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}

// POST - Update payment settings (Admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const validation = paymentSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { qrCodeImageUrl, upiId, accountHolderName, instructions } = validation.data;

    // Deactivate all previous settings
    await db.paymentSettings.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new active settings
    const settings = await db.paymentSettings.create({
      data: {
        qrCodeImageUrl,
        upiId,
        accountHolderName,
        instructions,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, data: settings });
  } catch (error) {
    console.error("Update payment settings error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
