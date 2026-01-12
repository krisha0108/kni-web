import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/rbac";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const engineerId = searchParams.get("engineerId");

    const payouts = await db.payout.findMany({
      where: {
        ...(status && { status: status as "PENDING" | "PAID" | "CANCELLED" }),
        ...(engineerId && { engineerId }),
      },
      include: {
        engineer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        assignment: {
          include: {
            booking: {
              include: {
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, data: payouts });
  } catch (error) {
    console.error("Get payouts error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
